"use client";

import React, { useEffect, useState } from "react";
import { Spin, Empty } from "antd";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import Navbar from "@/components/navbar";
import { Inserat, Applicant } from "@/types/inserat";

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-");
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
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [inserats, setInserats] = useState<Inserat[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsMap, setApplicantsMap] = useState<Record<string, Applicant[]>>({});

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const data = await apiService.get<Inserat[]>(`/users/${userId}/help-requests`);
        const sorted = data.sort((a, b) => {
          if (a.status === "DONE" && b.status !== "DONE") return 1;
          if (a.status !== "DONE" && b.status === "DONE") return -1;
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
    };
    fetchData();
  }, [userId]);

  const handleAccept = async (inseratId: string, volunteerId: string) => {
    try {
      const updated = await apiService.put<Inserat>(
        `/help-requests/${inseratId}/accept/${volunteerId}`, {}
      );
      setInserats((prev) => prev.map((i) => (i.id === inseratId ? updated : i)));
      setApplicantsMap((prev) => {
        const copy = { ...prev };
        delete copy[inseratId];
        return copy;
      });
    } catch (err) {
      console.error("Failed to accept volunteer", err);
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
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        textAlign: "center",
        fontSize: 28,
        fontWeight: 700,
        padding: "40px 0 20px",
      }}>
        My Requests
      </h1>

      <div style={{ padding: "0 16px 100px", maxWidth: 600, margin: "0 auto" }}>
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
                {/* Card header: date + description + edit */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                      {formatDate(inserat.date)}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>
                      {inserat.description}
                    </span>
                  </div>
                  {!isDone && (
                    <span style={{ color: "#bbb", fontSize: 14, whiteSpace: "nowrap", marginLeft: 8 }}>
                      edit request
                    </span>
                  )}
                </div>

                {/* OPEN: show applicants or "nobody applied" */}
                {isOpen && applicants.length === 0 && (
                  <div style={{ marginTop: 12, color: "#888", fontSize: 14 }}>
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
                        style={{
                          backgroundColor: "#d9737d",
                          color: "#fff",
                          border: "none",
                          borderRadius: 25,
                          padding: "10px 30px",
                          fontSize: 15,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        accept
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
                    You have accepted <strong>{inserat.volunteerAcceptedUsername}</strong> to help you.
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
  );
};

export default MyRequests;
