"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, Spin } from "antd";
import { User } from "@/types/user";
import Navbar from "@/components/navbar"
import { useApi } from "@/hooks/useApi";
import Link from "next/link";

const Profile: React.FC = () => {
  const apiService = useApi();
  const params = useParams();
  const id = params?.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const data = await apiService.get<User>(`/profile/${id}`);
        setUser(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

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

    <div style={{ "--role-color": user.isVolunteer ? "#53beb3" : "#d9737d", color: "black"} as React.CSSProperties}>
        <div className="headerBar">
            <Link href="/login" style={{color: "white"}} onClick={() => localStorage.clear()}>
                Logout
            </Link>

            <h1>Profile</h1>

            <Link href="/settings" style={{color: "white"}}>
                Settings
            </Link>
        </div>

        <div style={{
            backgroundColor: "var(--role-color)",
            height: "25vh",
            width: "100%",
            paddingTop: "60px",
            boxSizing: "border-box"
        }}>
        </div>

        <div className="profile-container" style={{marginTop: "-75px"}}>
            <Avatar size={120} style={{backgroundColor: user.isVolunteer ? "#3e9188ff" : "#964f56ff"}}>
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <h1 style={{ margin: "8px 0 4px" }}>{user.username}</h1>
          <p><strong>{roleLabel}</strong></p>

          <div style={{display: "flex", alignItems: "left", marginTop: "40px", flexDirection: "column", gap: "20px"}}>
            <p><strong>Bio: </strong>{user.bio}</p>
            <p><strong>Age: </strong>Well idk, but they were born {user.dateOfBirth}</p>
            <p><strong>Gender: </strong>{user.gender}</p>
          </div>
        {/* — Role-based navigation icons — */}
        <Navbar id={id as string} isVolunteer={user.isVolunteer} />
      </div>
    </div>
  );
};

export default Profile;