"use client";

import React from "react";
import { Card } from "antd";
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

const getIconConfigs = (id: string, isVolunteer: boolean): IconConfig[] =>
  isVolunteer
    ? [
        { icon: <HomeFilled style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Profile", href: `/profile/${id}` },
        { icon: <GlobalOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Feed", href: "/feedHandler" },
        { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Applications", href: "/inseratHandler" },
      ]
    : [
        { icon: <HomeFilled style={{ fontSize: 28, color: "#d9737d" }} />, label: "My Profile", href: `/profile/${id}` },
        { icon: <EditOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "New Inserat", href: "/feedHandler" },
        { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "My Inserat", href: "/inseratHandler" },
      ];

interface NavbarProps {
  id: string;
  isVolunteer: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ id, isVolunteer }) => {
  const iconConfigs = getIconConfigs(id, isVolunteer);

  return (
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
  );
};

export default Navbar;