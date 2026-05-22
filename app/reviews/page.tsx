'use client';

import React, { useEffect, useState } from 'react';
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Card, Button, Input, Typography, Tag, Empty, Rate } from "antd";
import Navbar from "@/components/navbar";
import Link from "next/link";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Review } from "@/types/review";

const { Title, Text } = Typography;
const api = new ApiService();

const INITIAL_VISIBLE_COUNT = 10;

export default function ReviewsPage() {
    const [pendingReview, setPendingReview] = useState<Review | null>(null);
    const [doneReviews, setDoneReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [reviewText, setReviewText] = useState("");
    const [stars, setStars] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

    const { value: userId } = useLocalStorage<string>("userId", "");
    const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

    const fetchReviews = async () => {
        if (!userId) return;
        try {
            setLoading(true);

            try {
                const pendingData = await api.get<Review>(`/profile/${userId}/pendingReview`);
                setPendingReview(pendingData && pendingData.id ? pendingData : null);
            } catch (err: unknown) {
                const apiError = err as { response?: { status?: number } };
                if (apiError.response?.status !== 204) {
                    console.error("Error fetching pending", err);
                }
                setPendingReview(null);
            }

            const doneData = await api.get<Review[]>(`/profile/${userId}/reviews/done`);
            // #158. newest reviews on top. The server doesn't guarantee order; sort here.
            const sorted = (doneData || []).slice().sort((a, b) => {
                return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
            });
            setDoneReviews(sorted);
        } catch {
            message.error("Failed to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleDismissForNow = async () => {
        // #151. pushes reminder out by 24h server-side.
        if (!pendingReview) return;
        setIsSubmitting(true);
        try {
            await api.post(`/profile/${userId}/reviews/${pendingReview.id}/dismiss-for-now`, {});
            setReviewText("");
            setStars(0);
            fetchReviews();
        } catch {
            message.error("Failed to dismiss review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitReview = async () => {
        if (!pendingReview) return;
        if (stars <= 0) {
            message.warning("Please pick a star rating.");
            return;
        }
        if (!reviewText.trim()) {
            message.warning("Please enter a review.");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post(`/profile/${userId}/reviews/${pendingReview.id}/write`, {
                text: reviewText,
                stars,
            });
            message.success("Review submitted!");
            setReviewText("");
            setStars(0);
            fetchReviews();
        } catch {
            message.error("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const visibleReviews = doneReviews.slice(0, visibleCount);
    const hasMore = doneReviews.length > visibleCount;

    return (
        <AuthWrapper>
            <div className="headerBar" style={{ "--role-color": isVolunteer ? "#53beb3" : "#d9737d"} as React.CSSProperties}>
                <h1>Review History</h1>
            </div>

            <div style={{
                maxWidth: '800px',
                margin: `calc(8vh + 16px) auto 0`,
                padding: '0 20px 100px',
            }}>

                {pendingReview && (
                    <div style={{ marginBottom: '40px' }}>
                        <Title level={4} style={{ color: '#e53935', marginTop: 0 }}>Action Required</Title>
                        <Card style={{ borderColor: '#e53935', borderRadius: '12px', backgroundColor: '#fff9f9' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <p style={{ margin: '0 0 8px 0' }}>The task{' '}
                                    <strong>{pendingReview.inseratDescription}</strong> has finished!</p>
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

                            <div style={{ marginBottom: 12 }}>
                                <Rate
                                    allowHalf
                                    value={stars}
                                    onChange={setStars}
                                    aria-label="Star rating from 0.5 to 5 in half steps"
                                    disabled={isSubmitting}
                                />
                                {stars > 0 && <span style={{ marginLeft: 12, color: "#555" }}>{stars.toFixed(1)} / 5</span>}
                            </div>

                            <Input.TextArea
                                rows={4}
                                maxLength={100}
                                showCount
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="They were fantastic and very helpful..."
                                disabled={isSubmitting}
                                style={{ marginBottom: '15px' }}
                            />
                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', justifyContent: 'center'}}>
                                <Button style={{ marginTop: "30px" }}
                                    onClick={handleDismissForNow}
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

                {/* Past reviews list. Replaces the deprecated antd <List> with Cards (#152) */}
                <div>
                    {loading ? (
                        <Card style={{ borderRadius: '12px' }}>
                            <Text type="secondary">Loading…</Text>
                        </Card>
                    ) : doneReviews.length === 0 ? (
                        <Card style={{ borderRadius: '12px' }}>
                            <Empty
                                description="You have no review history yet. Finish some tasks to see them here!"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {visibleReviews.map((review) => {
                                // #152: only render Written or Ignored. pending should never appear here
                                // because the server filters them out, but we still defensively check.
                                const statusTag = review.reviewStatus === 'IGNORED' ? (
                                    <Tag color="default" style={{ marginLeft: '8px' }}>Ignored forever</Tag>
                                ) : review.reviewStatus === 'WRITTEN' ? (
                                    <Tag color="green" style={{ marginLeft: '8px' }}>Written</Tag>
                                ) : null;

                                return (
                                    <Card
                                        key={review.id}
                                        style={{ borderRadius: '12px' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                            <span>
                                                {review.receiverId ? (
                                                    <Link href={`/profile/${review.receiverId}`} style={{ color: "inherit", textDecoration: "underline" }}>
                                                        <Text strong>@{review.receiverUsername || 'User'}</Text>
                                                    </Link>
                                                ) : (
                                                    <Text strong>@{review.receiverUsername || 'User'}</Text>
                                                )}
                                                {statusTag}
                                            </span>
                                            {/* #77 contrast: was '#888', moved to '#555' for WCAG AA */}
                                            <span style={{ color: '#555', fontSize: '12px' }}>{review.creationDate}</span>
                                        </div>

                                        {review.stars != null && review.stars > 0 && (
                                            <div style={{ marginTop: 4 }}>
                                                <Rate disabled allowHalf value={review.stars} style={{ fontSize: 14 }} />
                                                <span style={{ marginLeft: 8, color: "#555", fontSize: 12 }}>{review.stars.toFixed(1)} / 5</span>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '4px' }}>
                                            <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                                                Task: {review.inseratDescription}
                                            </Text>
                                            {review.text && (
                                                <Text italic style={{ display: 'block', marginTop: '4px', color: '#333' }}>
                                                    &quot;{review.text}&quot;
                                                </Text>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}

                            {hasMore && (
                                <Button
                                    type="default"
                                    onClick={() => setVisibleCount(c => c + INITIAL_VISIBLE_COUNT)}
                                    style={{ alignSelf: "center", marginTop: 8 }}
                                >
                                    Show more ({doneReviews.length - visibleCount} more)
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <Navbar id={userId} isVolunteer={isVolunteer} />
            </div>
        </AuthWrapper>
    );
}
