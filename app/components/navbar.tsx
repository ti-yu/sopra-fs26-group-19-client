"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  EditOutlined,
  StarOutlined,
} from "@ant-design/icons";

interface IconConfig {
  icon: React.ReactNode;
  href: string;
  label: string;
}

const getIconConfigs = (id: string, isVolunteer: boolean): IconConfig[] =>
  isVolunteer
    ? [
        { icon: <HomeOutlined style={{ fontSize: 28 }} />, label: "My Profile", href: `/profile/${id}` },
        { icon: <GlobalOutlined style={{ fontSize: 28 }} />, label: "My Feed", href: "/map" },
        { icon: <UnorderedListOutlined style={{ fontSize: 28 }} />, label: "My Applications", href: "/my-applications" },
        { icon: <StarOutlined style={{ fontSize: 28 }} />, label: "Reviews", href: "/reviews" },
      ]
    : [
        { icon: <HomeOutlined style={{ fontSize: 28 }} />, label: "My Profile", href: `/profile/${id}` },
        { icon: <EditOutlined style={{ fontSize: 28 }} />, label: "New Inserat", href: `/profile/${id}/CreateHelpRequest` },
        { icon: <UnorderedListOutlined style={{ fontSize: 28 }} />, label: "My Requests", href: "/my-requests" },
        { icon: <StarOutlined style={{ fontSize: 28 }} />, label: "Reviews", href: "/reviews" },
      ];

interface NavbarProps {
  id: string;
  isVolunteer: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ id, isVolunteer }) => {
  const pathname = usePathname();
  const iconConfigs = getIconConfigs(id, isVolunteer);
  const safeId = id || "";
  const roleColor = isVolunteer ? "#53beb3" : "#d9737d";

  const isActive = (href: string): boolean => {
    // Profile page: exact match on /profile/<id>
    if (href === `/profile/${safeId}`) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

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
      {iconConfigs.map(({ icon, label, href }) => {
        const active = isActive(href);
        return (
          <Link
            key={label}
            href={href}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {active ? (
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: roleColor,
                color: "#fff",
                fontSize: 28,
              }}>
                {icon}
              </span>
            ) : (
              <span style={{ color: roleColor, fontSize: 28, display: "flex", alignItems: "center" }}>
                {icon}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default Navbar;
