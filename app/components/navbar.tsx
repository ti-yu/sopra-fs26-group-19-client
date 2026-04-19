"use client";

import React from "react";
import Link from "next/link";
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
        { icon: <GlobalOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Feed", href: "/map" },
        { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#53beb3" }} />, label: "My Applications", href: "/my-applications" },
      ]
    : [
        { icon: <HomeFilled style={{ fontSize: 28, color: "#d9737d" }} />,label: "My Profile", href: `/profile/${id}` },
        { icon: <EditOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "New Inserat", href: `/profile/${id}/CreateHelpRequest` },
        { icon: <UnorderedListOutlined style={{ fontSize: 28, color: "#d9737d" }} />, label: "My Requests", href: "/my-requests" },
      ];

interface NavbarProps {
  id: string;
  isVolunteer: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ id, isVolunteer }) => {
  const iconConfigs = getIconConfigs(id, isVolunteer);
  const safeId = id || "";

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      backgroundColor: "#fafafa",
      borderTop: "1px solid #eeeeee",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      zIndex: 1000,
    }}>
        {iconConfigs.map(({ icon, label, href }) => (
            <Link
                key={label}
                href={href}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {icon}
            </Link>
        ))}
    </nav>
  );
};

export default Navbar;