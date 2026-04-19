"use client";

import React, { useState, useEffect } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Script from "next/script";
import Navbar from "@/components/navbar"
import { User } from "@/types/user";
import { Inserat } from "@/types/inserat"
import { Spin } from "antd";

const MapPage: React.FC = () => {
    const apiService = useApi();
    const { value: userId } = useLocalStorage<string>("userId", "");
    const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);
    
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const initMap = async () => {
        const { Map, InfoWindow } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const map = new Map(document.getElementById("map") as HTMLElement, {
            center: { lat: 47.3769, lng: 8.5417 },
            zoom: 12,
            mapId: "687f31f6db63e48236a75a4a",
        });

        const infoWindow = new InfoWindow();

        try {
            const inseratData = await apiService.get<Inserat[]>("/help-requests-map");
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
                marker.addListener("click", () => {
                    infoWindow.setContent(`
                        <div style="
                            padding: 12px;
                            min-width: 180px;
                            max-width: 250px;
                            max-height: 200px;
                            overflow-y: auto;
                            word-wrap: break-word;
                            border-radius: 8px;
                        ">
                            <h3 style="margin: 0 0 8px; word-break: break-word;">${inserat.description}</h3>
                            <p style="margin: 0 0 4px; word-break: break-word;">With: ${inserat.recipientSurname} ${inserat.recipientLastname}</p>
                            <p style="margin: 0 0 4px; font-size: 12px;">Age: ${inserat.recipientAge}</p>
                            <p style="margin: 0 0 4px; color: gray; font-size: 12px;">Where: ${inserat.location}</p>
                            <p style="margin: 0 0 4px; font-size: 12px;">📅 ${inserat.date}</p>
                            <p style="margin: 0; font-size: 12px;">🕐 ${inserat.timeframe}</p>
                            <p style="margin: 0; font-size: 12px;">${formatWorkType(inserat.workType ?? "")}</p>
                        </div>
                    `);
                    infoWindow.open(map, marker);
                });
            });
        } catch (err) {
            console.error("Failed to load inserats:", err);
        }
    };

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

    return (
        <>
            <div className="headerBar" style={{ background: "#f5f5f5", height: "8vh", top: "0px" }}>
                <p></p>
                <h1 style={{ color: "#000000" }}>Requests Map</h1>
                <p></p>
            </div>
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly`}
                strategy="afterInteractive"
                onLoad={initMap}
            />
            <div id="map" style={{ height: "calc(100vh - 10vh - 64px)", width: "100%", marginTop: "8vh" }} />
            <Navbar id={userId} isVolunteer={isVolunteer} />
        </>
    );
};

export default MapPage;