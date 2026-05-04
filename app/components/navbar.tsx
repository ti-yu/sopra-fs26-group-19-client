"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  EditOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { ApiService } from "@/api/apiService";

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
  const safeId = id || "";
  const roleColor = isVolunteer ? "#53beb3" : "#d9737d";
  const iconConfigs = getIconConfigs(safeId, isVolunteer);

  const [hasPendingReview, setHasPendingReview] = useState(false);

  const profileHref = `/profile/${safeId}`;
  const onProfilePage = pathname === profileHref;

  const isActive = (href: string): boolean => {
    if (href === profileHref) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Check for pending review whenever the path changes.
  // When on the profile page the ReviewModal handles the popup, so we clear the dot.
  useEffect(() => {
    if (!safeId) return;

    if (onProfilePage) {
      setHasPendingReview(false);
      return;
    }

    const api = new ApiService();
    api.get<{ id?: string }>(`/profile/${safeId}/pendingReview`)
      .then((res) => {
        setHasPendingReview(!!(res as { id?: string })?.id);
      })
      .catch(() => {
        setHasPendingReview(false);
      });
  }, [safeId, pathname]);

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
        const isHome = href === profileHref;
        const showDot = isHome && hasPendingReview && !onProfilePage;

        return (
          <Link
            key={label}
            href={href}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Fixed-size wrapper prevents layout shift when circle appears/disappears */}
            <span style={{ position: "relative", display: "inline-flex" }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: active ? roleColor : "transparent",
                color: active ? "#fff" : roleColor,
                fontSize: 28,
                flexShrink: 0,
              }}>
                {icon}
              </span>
              {showDot && (
                <span style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  backgroundColor: "#e53935",
                  border: "1.5px solid #fafafa",
                }} />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default Navbar;
