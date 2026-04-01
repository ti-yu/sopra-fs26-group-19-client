"use client";

import React from "react";
import {
  HomeFilled,
  GlobalOutlined,
  UnorderedListOutlined,
  EditOutlined
} from "@ant-design/icons";

interface IconConfig {
  icon: React.ReactNode;
  href: string;
  label: string;
}

const getIconConfigs = (id: string, isVolunteer: boolean): IconConfig[] =>
  isVolunteer
    ? [
        { icon: <HomeFilled style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Profile", href: `/profile/${id}` },
        { icon: <GlobalOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Feed", href: "/feedHandler" },
        { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Applications", href: "/inseratHandler" },
      ]
    : [
        { icon: <HomeFilled style={{ fontSize: 28, color: "#d9737d" }} />,label: "My Profile", href: `/profile/${id}` },
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
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      backgroundColor: "#ffffff",
      borderTop: "1px solid #eeeeee",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      zIndex: 1000,
    }}>
      {iconConfigs.map(({ icon, label, href }) => (
        <a
          key={label}
          href={href}
        >
          {icon}
        </a>
      ))}
    </nav>
  );
};

export default Navbar;