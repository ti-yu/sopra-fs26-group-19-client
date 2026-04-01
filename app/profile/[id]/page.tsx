"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, Spin } from "antd";
import { User } from "@/types/user";
import Navbar from "../../../components/navbar";
import { useApi } from "@/hooks/useApi";

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

  const roleColor = user.isVolunteer ? "green" : "red";
  const roleLabel = user.isVolunteer ? "Volunteer" : "Recipient";

  return (

    <div>
      <div className="" style={{position: "fixed", zIndex: 100, top: 0, width: "100%"}}>

        <a href=""> Logout </a>
        <h1>Profile</h1>
        <a href=""> Settings </a>

      </div>

      <div style={{ 
        backgroundColor: user.isVolunteer ? "#53beb3" : "#d9737d", 
        height: "25vh",
        width: "100%",
        paddingTop: "60px",
        boxSizing: "border-box"
      }}> 
      </div>

      <div className="profile-container" style={{marginTop: "-100px"}}>
          <Avatar size={150} style={{ backgroundColor: user.isVolunteer ? "#3e9188ff" : "#964f56ff"}}>
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <h1 style={{ margin: "8px 0 4px" }}>{user.username}</h1>
          <p><strong>{roleLabel}</strong></p>

          <div style={{display: "flex", alignItems: "left", marginTop: "40px", flexDirection: "column", gap: "20px"}}>
            <p><strong>Bio: </strong>{user.bio}</p>
            <p><strong>Age: </strong>Well idk, but they were born {user.dateOfBirth}</p>
          </div>
        {/* — Role-based navigation icons — */}
        <Navbar id={id as string} isVolunteer={user.isVolunteer} />
      </div>
    </div>
  );
};

export default Profile;