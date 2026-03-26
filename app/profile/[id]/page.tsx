// your code here for S2 to display a single user profile after having clicked on it
// each user has their own slug /[id] (/1, /2, /3, ...) and is displayed using this file
// try to leverage the component library from antd by utilizing "Card" to display the individual user
// import { Card } from "antd"; // similar to /app/users/page.tsx

"use client";
// For components that need React hooks and browser APIs,
// SSR (server side rendering) has to be disabled.
// Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Avatar, Tag, Spin } from "antd";
import { User } from "@/types/user"
import {
  HomeFilled,
  GlobalOutlined,
  UnorderedListOutlined,
  EditOutlined
} from "@ant-design/icons";
 
interface IconConfig {
  icon: React.ReactNode;
  label: string;
  href: string;
}
 
const VOLUNTEER_ICONS: IconConfig[] = [
  { icon: <HomeFilled style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Profile", href: "/profile[id]" },
  { icon: <GlobalOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Feed", href: "/feedHandler" },
  { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Applications", href: "/inseratHandler" },
];
 
const CLIENT_ICONS: IconConfig[] = [
  { icon: <HomeFilled style={{ fontSize: 28, color: "#d9737d" }} />, label: "My Profile", href: "/profile/[id]" },
  { icon: <EditOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "New Inserat", href: "/feedHandler" },
  { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "My Inserat", href: "/inseratHandler" },
];
 
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
        const res = await fetch(`/api/users/${id}`);
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
 
  const iconConfigs = user.isVolunteer ? VOLUNTEER_ICONS : CLIENT_ICONS;
  const roleColor    = user.isVolunteer ? "green" : "red";
  const roleLabel    = user.isVolunteer ? "Volunteer" : "Client";
 
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {iconConfigs.map(({ icon, label, href }) => (
          <a key={label} href={href} style={{ textDecoration: "none" }}>
            <Card
              hoverable
              style={{ textAlign: "center", padding: "12px 0" }}
              styles={{ body: { padding: "16px 8px" } }}
            >
              {icon}
              <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 500 }}>{label}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};
 
export default Profile;