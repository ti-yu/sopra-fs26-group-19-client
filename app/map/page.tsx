"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Script from "next/script";
import Navbar from "@/components/navbar"
import { User } from "@/types/user";
import { Inserat } from "@/types/inserat"
import { Spin, Card, Select, Slider, DatePicker, Button } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import Link from "next/link";

const formatWorkType = (workType: string): string => {
    const types: Record<string, string> = {
        GARDENING: "🌻 Gardening",
        SHOPPING: "🛒 Shopping & Groceries",
        HEAVY_LIFTING: "💪 Heavy Lifting",
        IT_SUPPORT: "💻 IT Support",
        TUTORING: "📚 Tutoring",
        TRANSPORT: "🚗 Transport",
        CLEANING: "🧹 Cleaning",
        OTHER: "✨ Other",
    };
    return types[workType] ?? workType;
};

// Work-type filter options surfaced in the filter panel.
const WORK_TYPE_OPTIONS = [
    "GARDENING",
    "SHOPPING",
    "HEAVY_LIFTING",
    "IT_SUPPORT",
    "TUTORING",
    "TRANSPORT",
    "CLEANING",
    "OTHER",
];

const FILTER_STORAGE_KEY = "mapFilter";

interface PersistedFilter {
    workTypes: string[];
    durationMin: number;
    durationMax: number;
    dateFromIso: string | null;
    dateToIso: string | null;
}

const DEFAULT_FILTER: PersistedFilter = {
    workTypes: [],
    durationMin: 0,
    durationMax: 9,
    dateFromIso: null,
    dateToIso: null,
};

const MapPage: React.FC = () => {
    const apiService = useApi();
    const { value: userId } = useLocalStorage<string>("userId", "");
    const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inserats, setInserats] = useState<Inserat[]>([]);
    const { value: view, set: setView } = useLocalStorage<"map" | "feed">("mapView", "map");

    // --- Filters (#161) -------------------------------------------------------
    // The filter panel persists last selection in localStorage so reopening the
    // page restores it. Filtering is purely client-side over `inserats`.
    const [filterOpen, setFilterOpen] = useState(false);
    const [workTypeFilter, setWorkTypeFilter] = useState<string[]>([]);
    const [durationRange, setDurationRange] = useState<[number, number]>([0, 9]);
    const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
    const [dateTo, setDateTo] = useState<Dayjs | null>(null);

    useEffect(() => {
        if (!userId) return;
        try {
            const raw = localStorage.getItem(`mapFilter_${userId}`);
            if (!raw) return;
            const parsed: PersistedFilter = JSON.parse(raw);
            setWorkTypeFilter(parsed.workTypes ?? []);
            setDurationRange([parsed.durationMin ?? 0, parsed.durationMax ?? 9]);
            setDateFrom(parsed.dateFromIso ? dayjs(parsed.dateFromIso) : null);
            setDateTo(parsed.dateToIso ? dayjs(parsed.dateToIso) : null);
        } catch {
            // Corrupt filter blob: ignore and use defaults.
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const blob: PersistedFilter = {
            workTypes: workTypeFilter,
            durationMin: durationRange[0],
            durationMax: durationRange[1],
            dateFromIso: dateFrom ? dateFrom.toISOString() : null,
            dateToIso: dateTo ? dateTo.toISOString() : null,
        };
        try {
            localStorage.setItem(`mapFilter_${userId}`, JSON.stringify(blob));
        } catch {
            // Storage full / Safari private mode. silent failure.
        }
    }, [workTypeFilter, durationRange, dateFrom, dateTo]);

    const filteredInserats = useMemo(() => {
        return inserats.filter(i => {
            // #139. never offer your own request in the volunteer's feed/map.
            if (i.recipientId === userId) return false;
            if (workTypeFilter.length > 0 && !workTypeFilter.includes(i.workType ?? "")) return false;
            const tf = parseFloat(i.timeframe);
            if (!Number.isNaN(tf)) {
                if (tf < durationRange[0] || tf > durationRange[1]) return false;
            }
            if (dateFrom && dayjs(i.date).isBefore(dateFrom, "day")) return false;
            if (dateTo && dayjs(i.date).isAfter(dateTo, "day")) return false;
            return true;
        });
    }, [inserats, workTypeFilter, durationRange, dateFrom, dateTo, userId]);

    const resetFilters = () => {
        setWorkTypeFilter(DEFAULT_FILTER.workTypes);
        setDurationRange([DEFAULT_FILTER.durationMin, DEFAULT_FILTER.durationMax]);
        setDateFrom(null);
        setDateTo(null);
    };
    const activeFilterCount =
        (workTypeFilter.length > 0 ? 1 : 0) +
        (durationRange[0] !== 0 || durationRange[1] !== 9 ? 1 : 0) +
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0);

    // Tracks which inserats the current volunteer has applied to.
    // appliedSetRef is used inside map marker closures (always current).
    // appliedSet is React state used to re-render the feed view.
    const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());
    const appliedSetRef = useRef<Set<string>>(new Set());

    const updateApplied = (newSet: Set<string>) => {
        appliedSetRef.current = newSet;
        setAppliedSet(new Set(newSet));
    };

    useEffect(() => {
        if (!userId) return;
        const fetchUser = async () => {
            try {
                const data = await apiService.get<User>(`/profile/${userId}`);
                setUser(data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load user");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userId]);

    const initMap = useCallback(async () => {
        const { Map: GoogleMap, InfoWindow } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const map = new GoogleMap(document.getElementById("map") as HTMLElement, {
            center: { lat: 46.7985, lng: 8.2318 },
            zoom: 8.5,
            mapId: "687f31f6db63e48236a75a4a",
        });

        const infoWindow = new InfoWindow();

        map.addListener("click", async (event: google.maps.MapMouseEvent & { placeId?: string }) => {
            if (!event.placeId) return;

            event.stop();

            const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

            const place = new Place({
                id: event.placeId,
                requestedLanguage: "en",
            });

            await place.fetchFields({
                fields: ["displayName", "formattedAddress", "googleMapsURI"],
            });

            infoWindow.setContent(`
                <div style="padding: 12px; min-width: 180px; max-width: 250px; border-radius: 8px;">
                <h3 style="margin: 0 0 8px; word-break: break-word;">${place.displayName ?? ""}</h3>
                <p style="margin: 0 0 4px; font-size: 12px;">${place.formattedAddress ?? ""}</p>
                ${place.googleMapsURI ? `
                    <a href="${place.googleMapsURI}" target="_blank" style="font-size: 12px; color: #53beb3; font-weight: 600;">
                        View on Google Maps
                    </a>
                    ` : ""}
                </div>
            `);
            
            infoWindow.setPosition(event.latLng);
            infoWindow.open(map);
            });

        try {
            const inseratData = await apiService.get<Inserat[]>("/help-requests-map");
            setInserats(inseratData);

            // Apply the user-visible filter to the marker set. #139. never
            // surface your own help requests in the volunteer map.
            const visibleInserats = inseratData.filter(i => {
                if (i.recipientId === userId) return false;
                if (workTypeFilter.length > 0 && !workTypeFilter.includes(i.workType ?? "")) return false;
                const tf = parseFloat(i.timeframe);
                if (!Number.isNaN(tf)) {
                    if (tf < durationRange[0] || tf > durationRange[1]) return false;
                }
                if (dateFrom && dayjs(i.date).isBefore(dateFrom, "day")) return false;
                if (dateTo && dayjs(i.date).isAfter(dateTo, "day")) return false;
                return true;
            });

            // Initialise which inserats the current user has already applied to
            const initialApplied = new Set(
                inseratData
                    .filter(i => i.volunteerAppliedIds?.includes(userId))
                    .map(i => i.id)
            );
            updateApplied(initialApplied);

            type TaggedMarker = google.maps.marker.AdvancedMarkerElement & { _inserats: Inserat[] };

            const openInfoWindow = (windowInserats: Inserat[], position: google.maps.LatLngLiteral) => {
                let currentPage = 0;

                const renderPage = () => {
                    const inserat = windowInserats[currentPage];
                    const total = windowInserats.length;
                    // #139. never show the apply button on a user's own inserat.
                    const showOfferButton = isVolunteer && inserat.status === "OPEN" && inserat.recipientId !== userId;
                    const alreadyApplied = appliedSetRef.current.has(inserat.id);
                    const buttonId = `offer-help-${inserat.id}`;
                    const buttonLabel = alreadyApplied ? "Withdraw" : "Lend a Hand";

                    infoWindow.setContent(`
                        <div style="padding: 12px; min-width: 180px; max-width: 250px; border-radius: 8px;">
                        ${total > 1 ? `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <button id="prev-${inserat.id}" style="background:none;border:none;cursor:pointer;font-size:28px;color:white;padding:0 6px;${currentPage === 0 ? "opacity:0.3;cursor:default;" : ""}">&#8249;</button>
                            <span style="font-size:17px;color:white;font-weight:600;">${currentPage + 1}&thinsp;/&thinsp;${total}</span>
                            <button id="next-${inserat.id}" style="background:none;border:none;cursor:pointer;font-size:28px;color:white;padding:0 6px;${currentPage === total - 1 ? "opacity:0.3;cursor:default;" : ""}">&#8250;</button>
                            </div>
                        ` : ""}
                        <h3 style="margin:0 0 8px;font-size:20px;word-break:break-word;">${inserat.description}</h3>
                        <p style="margin:0 0 4px;font-size:16px;word-break:break-word;">With: <a href="/profile/${inserat.recipientId}" style="color:inherit;text-decoration:underline;">${inserat.recipientUsername}</a></p>
                        <p style="margin:0 0 4px;font-size:16px;">Age: ${inserat.recipientAge}</p>
                        <p style="margin:0 0 4px;color:gray;font-size:16px;">Where: ${inserat.location}</p>
                        <p style="margin:0 0 4px;font-size:16px;">📅 ${inserat.date}</p>
                        <p style="margin:0;font-size:16px;">🕐 ${inserat.timeframe}h</p>
                        <p style="margin:0 0 8px;font-size:16px;">${formatWorkType(inserat.workType ?? "")}</p>
                        ${showOfferButton ? `<button id="${buttonId}" class="offer-button" style="${alreadyApplied ? "background-color:#888;" : ""}">${buttonLabel}</button>` : ""}
                        </div>
                    `);

                    infoWindow.setPosition(position);
                    infoWindow.open(map);

                    google.maps.event.addListenerOnce(infoWindow, "domready", () => {
                        const prevBtn = document.getElementById(`prev-${inserat.id}`);
                        const nextBtn = document.getElementById(`next-${inserat.id}`);

                        if (prevBtn && currentPage > 0) {
                            prevBtn.addEventListener("click", () => { currentPage--; renderPage(); });
                        }
                        if (nextBtn && currentPage < total - 1) {
                            nextBtn.addEventListener("click", () => { currentPage++; renderPage(); });
                        }

                        if (showOfferButton) {
                            const btn = document.getElementById(buttonId);
                            if (!btn) return;
                            btn.addEventListener("click", async () => {
                                const isApplied = appliedSetRef.current.has(inserat.id);
                                if (isApplied) {
                                    try {
                                        await apiService.delete(`/help-requests/${inserat.id}/apply/${userId}`);
                                        const next = new Set(appliedSetRef.current);
                                        next.delete(inserat.id);
                                        updateApplied(next);
                                        btn.textContent = "Lend a Hand";
                                        (btn as HTMLButtonElement).style.backgroundColor = "";
                                    } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to withdraw");
                                    }
                                } else {
                                    try {
                                        await apiService.post(`/help-requests/${inserat.id}/apply/${userId}`, {});
                                        const next = new Set(appliedSetRef.current);
                                        next.add(inserat.id);
                                        updateApplied(next);
                                        btn.textContent = "Withdraw";
                                        (btn as HTMLButtonElement).style.backgroundColor = "#888";
                                    } catch (err) {
                                        alert(err instanceof Error ? err.message : "Failed to apply");
                                    }
                                }
                            });
                        }
                    });
                };

                renderPage();
            };

            const allMarkers: TaggedMarker[] = [];

            const byCoord = new Map<string, Inserat[]>();
            visibleInserats.forEach(i => {
                const key = `${i.latitude},${i.longitude}`;
                const existing = byCoord.get(key);
                if (existing) {
                    existing.push(i);
                } else {
                    byCoord.set(key, [i]);
                }
            });

            byCoord.forEach((coLocatedInserats, coordKey) => {
                const [latStr, lngStr] = coordKey.split(",");
                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);
                const count = coLocatedInserats.length;

                // The pin is a container (so we can overlay a count badge
                // if more than one inserat shares this exact spot).
                const container = document.createElement("div");
                container.style.cssText = "position:relative;width:44px;height:57px;cursor:pointer;";

                const pinImg = document.createElement("img");
                pinImg.src = "/pin.png";
                pinImg.alt = "";
                pinImg.style.cssText = "width:44px;height:57px;display:block;";
                container.appendChild(pinImg);

                if (count > 1) {
                    const badge = document.createElement("div");
                    badge.textContent = String(count);
                    badge.style.cssText = [
                        "position:absolute",
                        "top:-8px",
                        "right:-10px",
                        "background:#e53935",
                        "color:#fff",
                        "border-radius:50%",
                        "min-width:26px",
                        "height:26px",
                        "font-size:15px",
                        "font-weight:700",
                        "display:flex",
                        "align-items:center",
                        "justify-content:center",
                        "border:2.5px solid #fff",
                        "box-shadow:0 2px 4px rgba(0,0,0,0.35)",
                        "padding:0 4px",
                        "line-height:1",
                    ].join(";");
                    container.appendChild(badge);
                }

                container.setAttribute("role", "img");
                container.setAttribute(
                    "aria-label",
                    count === 1
                        ? `Help request: ${coLocatedInserats[0].description}`
                        : `${count} help requests at this location`
                );

                const marker = new AdvancedMarkerElement({
                    map,
                    position: { lat, lng },
                    content: container,
                }) as TaggedMarker;

                marker._inserats = coLocatedInserats;

                // Click (fires when not inside a proximity cluster): open the
                // paginated info window for every inserat at this exact point.
                marker.addListener("click", () => {
                    const sorted = coLocatedInserats
                        .slice()
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    openInfoWindow(sorted, { lat, lng });
                });

                allMarkers.push(marker);
            });

            // Dynamic zoom-based clustering (merges overlapping pins, separates on zoom-in)
            const { MarkerClusterer } = await import("@googlemaps/markerclusterer");

            new MarkerClusterer({
                map,
                markers: allMarkers,
                renderer: {
                    render: ({ count, position }) => {
                        const container = document.createElement("div");
                        container.style.cssText = "position:relative;width:44px;height:57px;cursor:pointer;";

                        const img = document.createElement("img");
                        img.src = "/pin.png";
                        img.alt = "";
                        img.style.cssText = "width:44px;height:57px;display:block;";
                        container.appendChild(img);

                        container.setAttribute("role", "img");
                        container.setAttribute("aria-label", `${count} help requests at this location`);

                        const badge = document.createElement("div");
                        badge.textContent = String(count);
                        badge.style.cssText = [
                            "position:absolute",
                            "top:-8px",
                            "right:-10px",
                            "background:#e53935",
                            "color:#fff",
                            "border-radius:50%",
                            "min-width:26px",
                            "height:26px",
                            "font-size:15px",
                            "font-weight:700",
                            "display:flex",
                            "align-items:center",
                            "justify-content:center",
                            "border:2.5px solid #fff",
                            "box-shadow:0 2px 4px rgba(0,0,0,0.35)",
                            "padding:0 4px",
                            "line-height:1",
                        ].join(";");
                        container.appendChild(badge);

                        return new AdvancedMarkerElement({ position, content: container, zIndex: 999 });
                    },
                },
                onClusterClick: (_event, cluster) => {
                    // Each marker in the cluster may carry MULTIPLE co-located
                    // inserats. flatMap across them so the info window sees
                    // every underlying request.
                    const clusterInserats = ((cluster.markers ?? []) as TaggedMarker[])
                        .flatMap(m => m._inserats ?? [])
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const pos = cluster.position;
                    openInfoWindow(clusterInserats, { lat: pos.lat(), lng: pos.lng() });
                },
            });

        } catch (err) {
            console.error("Failed to load inserats:", err);
        }
    }, [apiService, isVolunteer, userId, workTypeFilter, durationRange, dateFrom, dateTo]);

    useEffect(() => {
        if (typeof google === "undefined") return;
        if (loading) return;
        initMap();
    }, [initMap, loading]);

    if (loading) {
        return (
            <div className="card-container" style={{ textAlign: "center", paddingTop: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="card-container">
                <p style={{ color: "red" }}>{error ?? "User not found."}</p>
            </div>
        );
    }

    const contentHeight = "calc(100vh - 8vh - 64px)";

    return (
        <>
            {/* Header with view toggle + filter button */}
            <div style={{ 
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "2vh clamp(0.5rem, 3vw, 5vh)",
                position: "fixed",
                zIndex: "100",
                width: "100%",
                height: "8vh",
                backgroundColor: "#f5f5f5",
                top: "0px",
                
                }}>
                <Button
                    type={filterOpen ? "primary" : "default"}
                    icon={<FilterOutlined />}
                    onClick={() => setFilterOpen(o => !o)}
                    aria-expanded={filterOpen}
                    aria-controls="map-filter-panel"
                    style={{height: "40px", fontWeight: "600"}}
                >
                    {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
                </Button>
                <h1 style={{"color": "#333333", fontSize: "clamp(1rem, 4vw, 2rem)", flex: "1", margin: "0, 4rem", textAlign: "center"}}> Help Requests </h1>
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        className={`toggle-button ${view === "map" ? "active" : ""}`}
                        onClick={() => setView("map")}
                    >
                        Map
                    </button>
                    <button
                        className={`toggle-button ${view === "feed" ? "active" : ""}`}
                        onClick={() => setView("feed")}
                    >
                        Feed
                    </button>
                </div>
            </div>

            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`}
                strategy="afterInteractive"
                onLoad={initMap}
            />

            {/* Filter panel. Appears below the header when toggled. Filters
                apply client-side to both map markers and feed cards. (#161) */}
            {filterOpen && (
                <div
                    id="map-filter-panel"
                    role="region"
                    aria-label="Help request filters"
                    style={{
                        position: "fixed",
                        top: "8vh",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        borderBottom: "1px solid #e0e0e0",
                        padding: "16px",
                        zIndex: 999,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Work type</label>
                            <Select
                                mode="multiple"
                                allowClear
                                style={{ width: "100%" }}
                                placeholder="All types"
                                value={workTypeFilter}
                                onChange={setWorkTypeFilter}
                                options={WORK_TYPE_OPTIONS.map(v => ({ value: v, label: formatWorkType(v) }))}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                                Duration: {durationRange[0]} to {durationRange[1] >= 9 ? "8+" : durationRange[1]} h
                            </label>
                            <Slider
                                range
                                min={0}
                                max={9}
                                step={0.5}
                                value={durationRange}
                                onChange={(value) => setDurationRange(value as [number, number])}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 140 }}>
                                <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>From</label>
                                <DatePicker
                                    style={{ width: "100%" }}
                                    value={dateFrom}
                                    onChange={setDateFrom}
                                    format="DD.MM.YYYY"
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 140 }}>
                                <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>To</label>
                                <DatePicker
                                    style={{ width: "100%" }}
                                    value={dateTo}
                                    onChange={setDateTo}
                                    format="DD.MM.YYYY"
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <Button className="filterButton" style={{height: "30px", fontWeight: "600"}} onClick={resetFilters}>Reset</Button>
                            <Button type="primary" style={{height: "30px", fontWeight: "600"}}  onClick={() => setFilterOpen(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map view, always rendered but hidden when feed is active */}
            <div
                id="map"
                style={{
                    height: contentHeight,
                    width: "100%",
                    marginTop: "8vh",
                    display: view === "map" ? "block" : "none",
                }}
            />

            {/* Feed view */}
            {view === "feed" && (
                <div style={{
                    height: contentHeight,
                    marginTop: "8vh",
                    overflowY: "auto",
                    padding: "1rem",
                }}>
                    {filteredInserats.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#555" }}>
                            {inserats.length === 0
                                ? "No requests found."
                                : "No requests match your filters."}
                        </p>
                    ) : (
                        filteredInserats.map(inserat => {
                            const alreadyApplied = appliedSet.has(inserat.id);
                            // #139. guard own inserats from showing the apply button (also filtered above).
                            const showButton = isVolunteer && inserat.status === "OPEN" && inserat.recipientId !== userId;

                            return (
                                <Card key={inserat.id} style={{ marginBottom: 12, paddingLeft: 12, borderRadius: 12 }}>
                                    <h3 style={{ fontSize: 20, marginBottom: 4 }}>{inserat.description}</h3>
                                    <p style={{ fontSize: 16, color: "#666", marginBottom: 2 }}>
                                        With: <Link href={`/profile/${inserat.recipientId}`} style={{ color: "inherit", textDecoration: "underline", fontSize: 16 }}>{inserat.recipientUsername}</Link>, age {inserat.recipientAge}
                                    </p>
                                    <p style={{ fontSize: 16, color: "#555", marginBottom: 2 }}>📍 {inserat.location}</p>
                                    <p style={{ fontSize: 16, marginBottom: 2 }}>📅 {inserat.date} · 🕐 {inserat.timeframe}h</p>
                                    <p style={{ fontSize: 16, marginBottom: showButton ? 8 : 0 }}>
                                        {formatWorkType(inserat.workType ?? "")}
                                    </p>
                                    {showButton && (
                                        <button
                                            className="offer-button"
                                            style={{
                                                maxWidth: "400px",
                                                backgroundColor: alreadyApplied ? "#888" : undefined,
                                                fontSize: "16px",
                                            }}
                                            onClick={async () => {
                                                if (alreadyApplied) {
                                                    try {
                                                        await apiService.delete(`/help-requests/${inserat.id}/apply/${userId}`);
                                                        const next = new Set(appliedSetRef.current);
                                                        next.delete(inserat.id);
                                                        updateApplied(next);
                                                    } catch (err) {
                                                        const msg = err instanceof Error ? err.message : "Failed to withdraw";
                                                        alert(msg);
                                                    }
                                                } else {
                                                    try {
                                                        await apiService.post(`/help-requests/${inserat.id}/apply/${userId}`, {});
                                                        const next = new Set(appliedSetRef.current);
                                                        next.add(inserat.id);
                                                        updateApplied(next);
                                                    } catch (err) {
                                                        const msg = err instanceof Error ? err.message : "Failed to apply";
                                                        alert(msg);
                                                    }
                                                }
                                            }}
                                        >
                                            {alreadyApplied ? "Withdraw" : "Lend a Hand"}
                                        </button>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            )}

            <Navbar id={userId} isVolunteer={isVolunteer} />
        </>
    );
};

export default MapPage;
