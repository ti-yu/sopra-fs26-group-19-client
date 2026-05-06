"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Script from "next/script";
import Navbar from "@/components/navbar"
import { User } from "@/types/user";
import { Inserat } from "@/types/inserat"
import { Spin, Card } from "antd";

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

const MapPage: React.FC = () => {
    const apiService = useApi();
    const { value: userId } = useLocalStorage<string>("userId", "");
    const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inserats, setInserats] = useState<Inserat[]>([]);
    const { value: view, set: setView } = useLocalStorage<"map" | "feed">("mapView", "map");

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
            center: { lat: 47.3769, lng: 8.5417 },
            zoom: 12,
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

            // Initialise which inserats the current user has already applied to
            const initialApplied = new Set(
                inseratData
                    .filter(i => i.volunteerAppliedIds?.includes(userId))
                    .map(i => i.id)
            );
            updateApplied(initialApplied);

            inseratData.forEach(inserat => {
                const pin = document.createElement("img");
                pin.src = "/pin.png";
                pin.style.cssText = `
                    width: 44px;
                    height: 57px;
                    cursor: pointer;
                `;

                const marker = new AdvancedMarkerElement({
                    map,
                    position: { lat: inserat.latitude, lng: inserat.longitude },
                    content: pin,
                });

                marker.addListener("click", () => {
                    const showOfferButton = isVolunteer && inserat.status === "OPEN";
                    const alreadyApplied = appliedSetRef.current.has(inserat.id);
                    const buttonId = `offer-help-${inserat.id}`;
                    const buttonLabel = alreadyApplied ? "Withdraw" : "Lend a Hand";

                    infoWindow.setContent(`
                        <div style="
                            padding: 12px;
                            min-width: 180px;
                            max-width: 250px;
                            max-height: 260px;
                            overflow-y: auto;
                            word-wrap: break-word;
                            border-radius: 8px;
                        ">
                            <h3 style="margin: 0 0 8px; word-break: break-word;">${inserat.description}</h3>
                            <p style="margin: 0 0 4px; word-break: break-word;">With: ${inserat.recipientUsername}</p>
                            <p style="margin: 0 0 4px; font-size: 12px;">Age: ${inserat.recipientAge}</p>
                            <p style="margin: 0 0 4px; color: gray; font-size: 12px;">Where: ${inserat.location}</p>
                            <p style="margin: 0 0 4px; font-size: 12px;">📅 ${inserat.date}</p>
                            <p style="margin: 0; font-size: 12px;">🕐 ${inserat.timeframe}h</p>
                            <p style="margin: 0 0 8px; font-size: 12px;">${formatWorkType(inserat.workType ?? "")}</p>
                            ${showOfferButton ? `<button id="${buttonId}" class="offer-button" style="${alreadyApplied ? "background-color:#888;" : ""}">${buttonLabel}</button>` : ""}
                        </div>
                    `);
                    infoWindow.open(map, marker);

                    if (showOfferButton) {
                        google.maps.event.addListenerOnce(infoWindow, "domready", () => {
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
                                        const msg = err instanceof Error ? err.message : "Failed to withdraw";
                                        alert(msg);
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
                                        const msg = err instanceof Error ? err.message : "Failed to apply";
                                        alert(msg);
                                    }
                                }
                            });
                        });
                    }
                });
            });
        } catch (err) {
            console.error("Failed to load inserats:", err);
        }
    }, [apiService, isVolunteer, userId]);

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
            {/* Header with view toggle */}
            <div className="headerBar" style={{ background: "#f5f5f5", height: "8vh", top: "0px" }}>
                <p></p>
                <h1> Help Requests </h1>
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

            {/* Map view — always rendered but hidden when feed is active */}
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
                    {inserats.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#888" }}>No requests found.</p>
                    ) : (
                        inserats.map(inserat => {
                            const alreadyApplied = appliedSet.has(inserat.id);
                            const showButton = isVolunteer && inserat.status === "OPEN";

                            return (
                                <Card key={inserat.id} style={{ marginBottom: 12, borderRadius: 12 }}>
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{inserat.description}</p>
                                    <p style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>With: {inserat.recipientUsername}, age {inserat.recipientAge}</p>
                                    <p style={{ fontSize: 12, color: "gray", marginBottom: 2 }}>📍 {inserat.location}</p>
                                    <p style={{ fontSize: 12, marginBottom: 2 }}>📅 {inserat.date} · 🕐 {inserat.timeframe}h</p>
                                    <p style={{ fontSize: 12, marginBottom: showButton ? 8 : 0 }}>
                                        {formatWorkType(inserat.workType ?? "")}
                                    </p>
                                    {showButton && (
                                        <button
                                            className="offer-button"
                                            style={{
                                                maxWidth: "400px",
                                                backgroundColor: alreadyApplied ? "#888" : undefined,
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
