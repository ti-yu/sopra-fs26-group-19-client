"use client";

import React, { useEffect, useState } from "react";
import { Spin, Empty } from "antd";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import Navbar from "@/components/navbar";
import AuthWrapper from "@/components/AuthWrapper";
import { Application } from "@/types/application";

const formatDate = (dateStr: string) => {
  const [, month, day] = dateStr.split("-");
  return `${day}.${month}`;
};

const statusLabel = (status: string, acceptedUsername: string | null, currentUsername: string) => {
  if (status === "OPEN") return "Waiting";
  if (status === "ACCEPTED") {
    if (acceptedUsername && acceptedUsername === currentUsername) return "Accepted";
    return "Not selected";
  }
  return "Done";
};

const MyApplications: React.FC = () => {
  const apiService = useApi();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [inserats, setInserats] = useState<Application[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const profile = await apiService.get<{ username: string }>(`/profile/${userId}`);
        setCurrentUsername(profile.username);

        const data = await apiService.get<Application[]>(`/users/${userId}/applications`);
        const sorted = data.sort((a, b) => {
          if (a.status === "DONE" && b.status !== "DONE") return 1;
          if (a.status !== "DONE" && b.status === "DONE") return -1;
          return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
        });
        setInserats(sorted);
      } catch (err) {
        console.error("Failed to load applications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

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
        <div className="headerBar" style={{ background: "#f5f5f5", height: "8vh", top: "0px" }}>
          <p></p>
          <h1>My Applications</h1>
          <p></p>
        </div>

        <div style={{ padding: "16vh 16px 100px", maxWidth: 600, margin: "0 auto" }}>
          {inserats.length === 0 ? (
            <Empty description="You haven't applied to any requests yet" style={{ marginTop: 40 }} />
          ) : (
            inserats.map((inserat) => {
              const isDone = inserat.status === "DONE";
              const isAcceptedByMe =
                inserat.status === "ACCEPTED" && inserat.volunteerAcceptedUsername === currentUsername;
              const isRejected =
                inserat.status === "ACCEPTED" && inserat.volunteerAcceptedUsername !== currentUsername;

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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>
                        {formatDate(inserat.date)}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>
                        {inserat.description}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isAcceptedByMe ? "#53beb3" : isRejected ? "#999" : "#c0a020",
                        whiteSpace: "nowrap",
                        marginLeft: 8,
                      }}
                    >
                      {statusLabel(inserat.status, inserat.volunteerAcceptedUsername, currentUsername)}
                    </span>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 14, color: "#555" }}>
                    Posted by <strong>{inserat.recipientUsername}</strong>
                    {inserat.location && (
                      <>
                        <br />
                        📍 {inserat.location}
                      </>
                    )}
                    {inserat.timeframe && (
                      <>
                        <br />
                        🕐 {inserat.timeframe}
                      </>
                    )}
                  </div>

                  {isAcceptedByMe && (
                    <div style={{ marginTop: 12, fontSize: 14 }}>
                      You were accepted! Here are the recipient&apos;s contact details:
                      {inserat.recipientPhone && (
                        <>
                          <br />
                          Phone number: <strong>{inserat.recipientPhone}</strong>
                        </>
                      )}
                      {inserat.recipientEmail && (
                        <>
                          <br />
                          Email: <strong>{inserat.recipientEmail}</strong>
                        </>
                      )}
                    </div>
                  )}

                  {isRejected && (
                    <div style={{ marginTop: 12, fontSize: 14, color: "#888" }}>
                      Someone else was selected for this request.
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

export default MyApplications;
