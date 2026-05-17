'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Card, List, Button, Input, Typography, Tag, } from "antd";
import Navbar from "@/components/navbar";
import Link from "next/link";

const { Title, Text } = Typography;
const api = new ApiService();

interface ReviewDTO {
    id: string;
    senderId: string;
    receiverId: string;
    inseratId: string;
    text: string;
    creationDate: string;
    reviewStatus?: string;
    receiverUsername?: string;
    inseratDescription?: string;
    inseratLocation?: string;
}

export default function ReviewsPage() {
    const router = useRouter();
    const [pendingReview, setPendingReview] = useState<ReviewDTO | null>(null);
    const [doneReviews, setDoneReviews] = useState<ReviewDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [userId, setUserId] = useState<string>("");
    const [isVolunteer, setIsVolunteer] = useState<boolean>(false);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);


    const fetchReviews = async () => {
        try {
            setLoading(true);
            const rawUserId = sessionStorage.getItem('userId');
            if (!rawUserId) return;
            const cleanUserId = rawUserId.replace(/"/g, '');

            try {
                const pendingData = await api.get<ReviewDTO>(`/profile/${cleanUserId}/pendingReview`);

                if (pendingData && pendingData.id) {
                    setPendingReview(pendingData);
                } else {
                    setPendingReview(null);
                }
            } catch (err: unknown) {
                const apiError = err as { response?: { status?: number } };
                if (apiError.response?.status !== 204) {
                    console.error("Error fetching pending", err);
                }
                setPendingReview(null);
            }

            const doneData = await api.get<ReviewDTO[]>(`/profile/${cleanUserId}/reviews/done`);
            setDoneReviews(doneData || []);

        } catch (error) {
            message.error("Failed to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const rawId = sessionStorage.getItem('userId')?.replace(/"/g, '');
        const rawIsVolunteer = sessionStorage.getItem('isVolunteer') === 'true';

        if (rawId) {
            setUserId(rawId);
            setIsVolunteer(rawIsVolunteer);
        }
        fetchReviews();
    }, []);

    const handleIgnore = async (reviewId: string) => {
        setIsSubmitting(true);
        try {
            const rawUserId = sessionStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${reviewId}/ignore`, {});
            message.success("Review ignored.");

            setReviewText("");
            fetchReviews();
        } catch (error) {
            message.error("Failed to ignore review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitReview = async () => {
        if (!reviewText.trim()) return message.warning("Please enter a review.");
        if (!pendingReview) return;
        setIsSubmitting(true);
        try {
            const rawUserId = sessionStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${pendingReview.id}/write`, {text: reviewText});
            message.success("Review submitted!");

            setReviewText("");
            fetchReviews();
        } catch (error) {
            message.error("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthWrapper>
            
            <div className="headerBar" style={{ background: "#f5f5f5", height: "8vh", top: "0px" }}>
                <p></p>
                <h1>Review History</h1>
                <p></p>
            </div>

            <div style={{maxWidth: '800px', margin: '16vh auto', padding: '0 20px', paddingBottom: '80px'}}>

                {pendingReview && (
                    <div style={{ marginBottom: '40px' }}>
                        <Title level={4} style={{ color: '#e53935', marginTop: 0 }}>Action Required</Title>
                        <Card style={{borderColor: '#e53935', borderRadius: '12px', backgroundColor: '#fff9f9'}}>
                            <div style={{marginBottom: '15px'}}>
                                <p style={{margin: '0 0 8px 0'}}>The
                                    task <strong>{pendingReview.inseratDescription}</strong> has finished!</p>
                                <Text type="secondary">
                                    Review your experience with{" "}
                                    {pendingReview.receiverId ? (
                                        <Link href={`/profile/${pendingReview.receiverId}`} style={{ color: "inherit", textDecoration: "underline" }}>
                                            @{pendingReview.receiverUsername}
                                        </Link>
                                    ) : (
                                        <span>@{pendingReview.receiverUsername}</span>
                                    )}
                                    {" "}to help build trust in our community:
                                </Text>
                            </div>

                            <Input.TextArea
                                rows={4}
                                maxLength={100}
                                showCount
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="They were fantastic and very helpful..."
                                disabled={isSubmitting}
                                style={{marginBottom: '15px'}}
                            />
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <Button
                                    onClick={() => handleIgnore(pendingReview.id)}
                                    disabled={isSubmitting}
                                >
                                    Ignore for now
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={submitReview}
                                    loading={isSubmitting}
                                    style={{ backgroundColor: '#e53935' }}
                                >
                                    Submit Review
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                <div>
                    <Card style={{ borderRadius: '12px' }}>
                        <List
                            loading={loading}
                            dataSource={doneReviews}
                            locale={{emptyText: "You have no review history yet. Finish some tasks to see them here!"}}
                            renderItem={(review) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={
                                            <span>
                                            {review.receiverId ? (
                                                <Link href={`/profile/${review.receiverId}`} style={{ color: "inherit", textDecoration: "underline" }}>
                                                    @{review.receiverUsername || 'User'}
                                                </Link>
                                            ) : (
                                                <span>@{review.receiverUsername || 'User'}</span>
                                            )}
                                                {review.reviewStatus === 'IGNORED' ? (
                                                    <Tag color="default" style={{marginLeft: '8px'}}>Ignored</Tag>
                                                ) : (
                                                    <Tag color="green" style={{marginLeft: '8px'}}>Written</Tag>
                                                )}
                                        </span>
                                        }
                                        description={
                                            <div style={{ marginTop: '4px' }}>
                                                {/* 14. CHANGED: Tweaked the styling of the text below the username */}
                                                {/* WHY: Made the task description slightly smaller so the actual Review quote stands out more clearly. */}
                                                <Text type="secondary" style={{display: 'block', fontSize: '12px' }}>
                                                    Task: {review.inseratDescription}
                                                </Text>
                                                {review.text && (
                                                    <Text italic style={{ display: 'block', marginTop: '4px', color: '#333' }}>
                                                        &quot;{review.text}&quot;
                                                    </Text>
                                                )}
                                            </div>
                                        }
                                    />
                                    <div style={{color: '#888', fontSize: '12px'}}>{review.creationDate}</div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </div>

                <Navbar id={userId} isVolunteer={isVolunteer} />
            </div>
        </AuthWrapper>
    );
}