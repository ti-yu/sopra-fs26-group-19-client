"use client";

import React from "react";

/**
 * Shared sticky banner used on profile-style pages (Profile, My Requests,
 * Review History, etc.). Background colour follows the current role (recipient
 * pink vs volunteer teal). The banner is `position: fixed` and stays at the
 * top while the page scrolls. content below the banner needs `marginTop: 60px`
 * (matching `bannerHeight`) so it doesn't slide under the header.
 *
 * Optional `left` / `right` slots render small action links (e.g. Logout,
 * Settings on the profile page).
 */
export interface PageBannerProps {
  /** Page title shown centered on the banner. */
  title: string;
  /** Drives the background colour. true => teal, false => pink. */
  isVolunteer: boolean;
  /** Optional element on the left side of the banner (e.g. a logout link). */
  left?: React.ReactNode;
  /** Optional element on the right side of the banner (e.g. a settings link). */
  right?: React.ReactNode;
  /**
   * Render a colored band underneath the fixed header so the avatar / first
   * content can overlap (as on the profile page). Set to a non-zero height
   * in vh (default 0 = no band).
   */
  bandHeightVh?: number;
}

export const BANNER_HEIGHT_PX = 60;

const PageBanner: React.FC<PageBannerProps> = ({
  title,
  isVolunteer,
  left,
  right,
  bandHeightVh = 0,
}) => {
  const roleColor = isVolunteer ? "#53beb3" : "#d9737d";

  return (
    <>
      <div
        className="headerBar"
        role="banner"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: BANNER_HEIGHT_PX,
          backgroundColor: roleColor,
          zIndex: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        {/* Always render placeholder elements so the H1 stays centered. */}
        <div style={{ minWidth: 80, display: "flex", justifyContent: "flex-start" }}>
          {left ?? <span aria-hidden="true" />}
        </div>
        <h1 style={{ color: "#ffffff", margin: 0, fontSize: 22 }}>{title}</h1>
        <div style={{ minWidth: 80, display: "flex", justifyContent: "flex-end" }}>
          {right ?? <span aria-hidden="true" />}
        </div>
      </div>
      {bandHeightVh > 0 && (
        <div
          aria-hidden="true"
          style={{
            backgroundColor: roleColor,
            height: `${bandHeightVh}vh`,
            width: "100%",
            marginTop: BANNER_HEIGHT_PX,
            boxSizing: "border-box",
          }}
        />
      )}
    </>
  );
};

export default PageBanner;
