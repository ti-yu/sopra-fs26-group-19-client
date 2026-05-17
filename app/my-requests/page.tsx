"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Spin, Empty, Tag } from "antd";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import Navbar from "@/components/navbar";
import AuthWrapper from "@/components/AuthWrapper";
import PageBanner, { BANNER_HEIGHT_PX } from "@/components/PageBanner";
import { Inserat, Applicant } from "@/types/inserat";

const formatDate = (dateStr: string) => {
  const [, month, day] = dateStr.split("-");
  return `${day}.${month}`;
};

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
};

const MyRequests: React.FC = () => {
  const apiService = useApi();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [inserats, setInserats] = useState<Inserat[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsMap, setApplicantsMap] = useState<Record<string, Applicant[]>>({});

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiService.get<Inserat[]>(`/users/${userId}/help-requests`);
      // #157. keep ACCEPTED visible. Sort: OPEN first (newest), then ACCEPTED, then DONE.
      const statusRank = (s: string) => (s === "OPEN" ? 0 : s === "ACCEPTED" ? 1 : 2);
      const sorted = data.slice().sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;
        return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
      });
      setInserats(sorted);

      // Fetch applicants for all OPEN inserats
      const openInserats = sorted.filter((i) => i.status === "OPEN");
      const applicantEntries = await Promise.all(
        openInserats.map(async (inserat) => {
          const applicants = await apiService.get<Applicant[]>(
            `/help-requests/${inserat.id}/applicants`
          );
          return [inserat.id, applicants] as [string, Applicant[]];
        })
      );
      setApplicantsMap(Object.fromEntries(applicantEntries));
    } catch (err) {
      console.error("Failed to load help requests", err);
    } finally {
      setLoading(false);
    }
  }, [userId, apiService]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async (inseratId: string, volunteerId: string) => {
    // #157. Show loading state while the PUT round-trip completes, then refetch
    // the full list so the accepted inserat re-renders with status ACCEPTED
    // (visible, not vanished) and applicants disappear.
    const key = `${inseratId}-${volunteerId}`;
    if (acceptingId === key) return;
    setAcceptingId(key);
    try {
      await apiService.put<Inserat>(
        `/help-requests/${inseratId}/accept/${volunteerId}`, {}
      );
      await fetchData();
    } catch (err) {
      console.error("Failed to accept volunteer", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDismiss = async (inseratId: string, volunteerId: string) => {
    try {
      await apiService.put<Inserat>(
        `/help-requests/${inseratId}/dismiss/${volunteerId}`, {}
      );
      setApplicantsMap((prev) => ({
        ...prev,
        [inseratId]: (prev[inseratId] || []).filter((a) => a.id !== volunteerId),
      }));
      setInserats((prev) =>
        prev.map((i) =>
          i.id === inseratId
            ? { ...i, volunteerAppliedCount: i.volunteerAppliedCount - 1 }
            : i
        )
      );
    } catch (err) {
      console.error("Failed to dismiss volunteer", err);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
    <div>
      <PageBanner title="My Requests" isVolunteer={isVolunteer} />

      <div style={{ padding: `${BANNER_HEIGHT_PX + 16}px 16px 100px`, maxWidth: 600, margin: "0 auto" }}>
        {inserats.length === 0 ? (
          <Empty description="No help requests yet" style={{ marginTop: 40 }} />
        ) : (
          inserats.map((inserat) => {
            const isDone = inserat.status === "DONE";
            const isAccepted = inserat.status === "ACCEPTED";
            const isOpen = inserat.status === "OPEN";
            const applicants = applicantsMap[inserat.id] || [];

            return (
              <div
                key={inserat.id}
                style={{
                  background: "#f5f5f5",
                  opacity: isDone ? 0.5 : 1,
                  borderRadius: 16,
                  padding: "20px 20px",
                  marginBottom: 16,
                }}
              >
                {/* Card header: date + description + status + edit */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                      {formatDate(inserat.date)}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                      {inserat.description}
                    </span>
                    {/* #76: don't rely on color/opacity alone, show a textual status tag. */}
                    {isDone ? (
                      <Tag color="default">Done</Tag>
                    ) : isAccepted ? (
                      <Tag color="green">Accepted</Tag>
                    ) : (
                      <Tag color="blue">Open</Tag>
                    )}
                  </div>
                  {!isDone && isOpen && (
                    inserat.volunteerAppliedCount === 0 ? (
                      <Link
                        href={`/my-requests/${inserat.id}/edit`}
                        style={{ color: "#d9737d", fontSize: 14, whiteSpace: "nowrap", marginLeft: 8, fontWeight: 500 }}
                      >
                        <strong>Edit Request</strong>
                      </Link>
                    ) : (
                      <span
                        title="Cannot edit once someone has applied"
                        style={{ color: "#bbb", fontSize: 14, whiteSpace: "nowrap", marginLeft: 8, fontWeight: 500, cursor: "not-allowed", userSelect: "none" }}
                      >
                        <strong>Edit Request</strong>
                      </span>
                    )
                  )}
                </div>

                {/* OPEN: show applicants or "nobody applied" */}
                {isOpen && applicants.length === 0 && (
                  <div style={{ marginTop: 12, color: "#555", fontSize: 14 }}>
                    Nobody has yet applied for this request.
                  </div>
                )}

                {isOpen && applicants.map((applicant) => (
                  <div key={applicant.id} style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>
                      <strong>{applicant.username}</strong>
                      {applicant.dateOfBirth && ` (${calculateAge(applicant.dateOfBirth)})`}
                      {" "}has applied to your request!
                      <br />
                      Do you want to accept?
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => handleAccept(inserat.id, applicant.id)}
                        disabled={acceptingId === `${inserat.id}-${applicant.id}`}
                        aria-busy={acceptingId === `${inserat.id}-${applicant.id}`}
                        style={{
                          backgroundColor: "#d9737d",
                          color: "#fff",
                          border: "none",
                          borderRadius: 25,
                          padding: "10px 30px",
                          fontSize: 15,
                          fontWeight: 500,
                          cursor: acceptingId === `${inserat.id}-${applicant.id}` ? "not-allowed" : "pointer",
                          opacity: acceptingId === `${inserat.id}-${applicant.id}` ? 0.6 : 1,
                        }}
                      >
                        {acceptingId === `${inserat.id}-${applicant.id}` ? "Saving…" : "accept"}
                      </button>
                      <button
                        onClick={() => handleDismiss(inserat.id, applicant.id)}
                        style={{
                          backgroundColor: "#c0c0c0",
                          color: "#fff",
                          border: "none",
                          borderRadius: 25,
                          padding: "10px 30px",
                          fontSize: 15,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        dismiss
                      </button>
                    </div>
                  </div>
                ))}

                {/* ACCEPTED: show accepted volunteer with contact info */}
                {isAccepted && inserat.volunteerAcceptedUsername && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    You have accepted <strong><Link href={`/profile/${inserat.volunteerAcceptedId}`} style={{ color: "inherit", textDecoration: "underline" }}>{inserat.volunteerAcceptedUsername}</Link></strong> to help you.
                    {inserat.volunteerAcceptedPhone && (
                      <>
                        <br />
                        Phone number: <strong>{inserat.volunteerAcceptedPhone}</strong>
                      </>
                    )}
                    {inserat.volunteerAcceptedEmail && (
                      <>
                        <br />
                        Email: <strong>{inserat.volunteerAcceptedEmail}</strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Navbar id={userId} isVolunteer={isVolunteer} />
    </div>
    </AuthWrapper>
  );
};

export default MyRequests;
