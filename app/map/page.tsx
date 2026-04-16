"use client";

import React, { useState, useEffect } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useApi } from "@/hooks/useApi";
import Script from "next/script";
import Navbar from "@/components/navbar"
import { User } from "@/types/user";
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

  const roleLabel = user.isVolunteer ? "Volunteer" : "Recipient";
    

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly`}
        strategy="afterInteractive"
      />
      {/* @ts-ignore */}
      <gmp-map
        center="47.3769,8.5417"
        zoom="12"
        map-id="DEMO_MAP_ID"
        style={{height: "100vh"}}
      />
      <Navbar id={userId} isVolunteer={isVolunteer} />
    </>
  );
};

export default MapPage;