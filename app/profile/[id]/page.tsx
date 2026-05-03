"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, Spin, Card, Tag, Empty, Typography } from "antd";
import { User } from "@/types/user";
import Navbar from "@/components/navbar"
import { useApi } from "@/hooks/useApi";
import Link from "next/link";
import AuthWrapper from "@/components/AuthWrapper";
import ReviewModal from '@/components/ReviewModal';

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
    senderUsername: string;
    text: string;
    creationDate: string;
    inseratDescription: string;
}

const Profile: React.FC = () => {
  const apiService = useApi();
  const params = useParams();
  const id = params?.id;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    const [receivedReviews, setReceivedReviews] = useState<ReviewDTO[]>([]);

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
                setReceivedReviews(reviewsData || []); // Store the reviews
                sessionStorage.setItem("isVolunteer", String(userData.isVolunteer));
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

  return (
      <AuthWrapper>
    <div style={{ "--role-color": user.isVolunteer ? "#53beb3" : "#d9737d", color: "black"} as React.CSSProperties}>
        <div className="headerBar">
            <Link href="/login" style={{color: "white"}} onClick={() => sessionStorage.clear()}>
                Logout
            </Link>

            <h1 style={{color: "#ffffff"}}>Profile</h1>

            <Link href="/settings" style={{color: "white"}}>
                Settings
            </Link>
        </div>

        <div style={{
            backgroundColor: "var(--role-color)",
            height: "25vh",
            width: "100%",
            paddingTop: "60px",
            boxSizing: "border-box"
        }}>
        </div>

        <div className="profile-container" style={{marginTop: "-75px"}}>
            <Avatar size={120} style={{backgroundColor: user.isVolunteer ? "#3e9188ff" : "#964f56ff"}}>
                {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <h1 style={{margin: "8px 0 4px"}}>{user.username}</h1>
            <p><strong>{roleLabel}</strong></p>

            <div style={{display: "flex", alignItems: "left", marginTop: "40px", flexDirection: "column", gap: "20px"}}>
                <p><strong>Bio: </strong>{user.bio}</p>
                <p><strong>Age: </strong>{user.dateOfBirth ? calculateAge(user.dateOfBirth) : "Unknown"}</p>
                <p><strong>Gender: </strong>{user.gender}</p>
                <div style={{marginTop: '20px', textAlign: 'left', paddingBottom: '100px'}}>
                    <h3 style={{borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                        Reviews from the Community
                    </h3>

                    {receivedReviews.length > 0 ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
                            {receivedReviews.map((review) => (
                                <Card
                                    key={review.id}
                                    size="small"
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: '#fafafa',
                                        borderLeft: `5px solid var(--role-color)`
                                    }}
                                >
                                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                        <Typography.Text strong>@{review.senderUsername}</Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                            {review.creationDate}
                                        </Typography.Text>
                                    </div>

                                    <div style={{ margin: '8px 0' }}>
                                        <Typography.Text italic>&quot;{review.text}&quot;</Typography.Text>
                                    </div>
                                    <Tag color="blue" style={{fontSize: '10px'}}>
                                        Task: {review.inseratDescription}
                                    </Tag>
                                </Card>
                            ))}
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


            <ReviewModal/>

            {/* — Role-based navigation icons — */}
            <Navbar id={id as string} isVolunteer={user.isVolunteer}/>
        </div>
    </div>
      </AuthWrapper>
  );
};

export default Profile;