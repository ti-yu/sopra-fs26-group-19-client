"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, Spin, Card, Tag, Empty, Typography, Rate, Button } from "antd";
import { User } from "@/types/user";
import Navbar from "@/components/navbar"
import { useApi } from "@/hooks/useApi";
import Link from "next/link";
import AuthWrapper from "@/components/AuthWrapper";
import ReviewModal from '@/components/ReviewModal';
import useLocalStorage from "@/hooks/useLocalStorage";

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

interface ReviewDTO {
    id: string;
    senderId: string;
    senderUsername: string;
    text: string;
    creationDate: string;
    inseratDescription: string;
    stars?: number | null;
}

const INITIAL_REVIEW_COUNT = 10;

const Profile: React.FC = () => {
  const apiService = useApi();
  const params = useParams();
  const id = params?.id;
  const { value: userIdLocalStorage } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    const [receivedReviews, setReceivedReviews] = useState<ReviewDTO[]>([]);
    const [visibleReviewCount, setVisibleReviewCount] = useState(INITIAL_REVIEW_COUNT);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [userData, reviewsData] = await Promise.all([
                    apiService.get<User>(`/profile/${id}`),
                    apiService.get<ReviewDTO[]>(`/profile/${id}/reviews/received`)
                ]);

                setUser(userData);
                // #158. newest first. Server doesn't guarantee order; sort client-side.
                const sorted = (reviewsData || []).slice().sort((a, b) => {
                    return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
                });
                setReceivedReviews(sorted);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load user");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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

  const roleLabel = user.isVolunteer ? "Volunteer" : "Recipient";
  // Heading rewords itself based on whose profile we're on (#10 polish):
  // a volunteer receives reviews from clients (recipients) and vice-versa.
  const reviewsHeading = user.isVolunteer ? "Reviews from clients" : "Reviews from helpers";
  const visibleReviews = receivedReviews.slice(0, visibleReviewCount);
  const hasMoreReviews = receivedReviews.length > visibleReviewCount;

    const validRatings = receivedReviews.filter(r => typeof r.stars === 'number' && r.stars > 0);
    const averageRating = validRatings.length > 0
        ? validRatings.reduce((sum, r) => sum + r.stars!, 0) / validRatings.length
        : 0;

  return (
      <AuthWrapper>
          <div
              style={{"--role-color": user.isVolunteer ? "#53beb3" : "#d9737d", color: "black",} as React.CSSProperties}>
              <div className="headerBar" style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "60px",
                  backgroundColor: "var(--role-color)",
                  zIndex: 1000,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 20px"
              }}>
                  <Link href="/login" style={{color: "white", textDecoration: "none"}}
                        onClick={() => sessionStorage.clear()}>
                      Logout
                  </Link>

                  <h1 style={{color: "#ffffff", margin: 0}}>Profile</h1>

                  <Link href="/settings" style={{color: "white", textDecoration: "none"}}>
                      Settings
                  </Link>
              </div>
              <div style={{
                  backgroundColor: "var(--role-color)",
                  height: "20vh",
                  width: "100%",
                  marginTop: "60px",
                  boxSizing: "border-box"
              }}>
              </div>

              <div className="profile-container" style={{marginTop: "-75px",}}>
                  <Avatar
                      size={120}
                      src={user.profilePicture ?? "/default_pb.png"}
                      style={{backgroundColor: user.isVolunteer ? "#3e9188ff" : "#964f56ff"}}
                  >
                      {!user.profilePicture && user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <h1 style={{margin: "8px 0 4px"}}>{user.username}</h1>
                  <p><strong>{roleLabel}</strong></p>

                  <div style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: "40px",
                      flexDirection: "column",
                      gap: "20px",
                      width: "80vw",
                      maxWidth: "700px",
                  }}>
                      <div style={{
                          display: "flex",
                          alignItems: "flex-start",
                          flexDirection: "column",
                          gap: "20px",
                      }}>
                          <p><strong>Bio: </strong>{user.bio}</p>
                          <p><strong>Age: </strong>{user.dateOfBirth ? calculateAge(user.dateOfBirth) : "Unknown"}</p>
                          <p><strong>Gender: </strong>{user.gender}</p>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <strong>Rating: </strong>
                              {validRatings.length > 0 ? (
                                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                      <Rate disabled allowHalf value={averageRating}
                                            style={{color: "var(--role-color)", fontSize: "18px", margin: 0}}/>
                                      <span style={{
                                          color: "#555",
                                          fontWeight: "bold"
                                      }}>({averageRating.toFixed(1)})</span>
                                      <span style={{
                                          color: "#555",
                                          fontSize: "12px"
                                      }}> from {validRatings.length} reviews</span>
                                  </div>
                              ) : (
                                  <span style={{color: "#888", fontStyle: "italic"}}>No ratings yet</span>
                              )}
                          </div>
                      </div>
                      <div style={{marginTop: '20px', textAlign: 'left', paddingBottom: '100px'}}>
                          <h3 style={{borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                              {reviewsHeading}
                          </h3>

                          {receivedReviews.length > 0 ? (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
                                  {visibleReviews.map((review) => (
                                      <Card
                                          key={review.id}
                                          size="small"
                                          style={{
                                              borderRadius: '12px',
                                              backgroundColor: '#fafafa',
                                              borderLeft: `5px solid var(--role-color)`
                                          }}
                                      >
                                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8}}>
                                              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                  <Link href={`/profile/${review.senderId}`} style={{ color: "inherit", textDecoration: "underline" }}>
                                                      <Typography.Text strong>From {review.senderUsername}</Typography.Text>
                                                  </Link>
                                                  {review.stars != null && review.stars > 0 && (
                                                      <span>
                                                          <Rate disabled allowHalf value={review.stars} style={{ fontSize: 14 }} />
                                                          {/* color:#555 instead of secondary (#888) for WCAG AA contrast (#77) */}
                                                          <span style={{ marginLeft: 8, color: "#555", fontSize: 12 }}>{review.stars.toFixed(1)} / 5</span>
                                                      </span>
                                                  )}
                                              </span>
                                              <Typography.Text style={{ fontSize: '12px', color: '#555' }}>
                                                  {review.creationDate}
                                              </Typography.Text>
                                          </div>

                                          <div style={{margin: '8px 0'}}>
                                              <Typography.Text italic>&quot;{review.text}&quot;</Typography.Text>
                                          </div>
                                          <Tag color="blue" style={{fontSize: '10px'}}>
                                              Task: {review.inseratDescription}
                                          </Tag>
                                      </Card>
                                  ))}

                                  {hasMoreReviews && (
                                      <Button
                                          type="default"
                                          onClick={() => setVisibleReviewCount(c => c + INITIAL_REVIEW_COUNT)}
                                          style={{ alignSelf: "center" }}
                                      >
                                          Show more ({receivedReviews.length - visibleReviewCount} more)
                                      </Button>
                                  )}
                              </div>
                          ) : (
                              <Empty
                                  description="No reviews yet."
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  style={{marginTop: '20px'}}
                              />
                          )}
                      </div>
                  </div>


                  <ReviewModal userId={userIdLocalStorage}/>
                  <Navbar id={userIdLocalStorage} isVolunteer={isVolunteer}/>
              </div>
          </div>
      </AuthWrapper>
  );
};

export default Profile;