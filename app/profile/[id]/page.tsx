"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Avatar, Tag, Spin } from "antd";
import { User } from "@/types/user";
import Navbar from "../../../components/navbar";

const Profile: React.FC = () => {
  const params = useParams();
  const id = params?.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/profile/${id}`);
        if (!res.ok) throw new Error(`User not found (${res.status})`);
        const data: User = await res.json();
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
  const roleLabel = user.isVolunteer ? "Volunteer" : "Client";

  return (
    <div className="card-container" style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* — User profile card — */}
      <Card style={{ marginBottom: 24, textAlign: "center" }}>
        <Avatar size={72} style={{ backgroundColor: user.isVolunteer ? "#53beb3" : "#d9737d", marginBottom: 12 }}>
          {user.username.charAt(0).toUpperCase()}
        </Avatar>
        <h2 style={{ margin: "8px 0 4px" }}>{user.username}</h2>
        <Tag color={roleColor} style={{ marginBottom: 4 }}>{roleLabel}</Tag>
      </Card>

      {/* — Role-based navigation icons — */}
      <Navbar id={id as string} isVolunteer={user.isVolunteer} />
    </div>
  );
};

export default Profile;