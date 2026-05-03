'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Card, List, Button, Input, Typography, Tag, } from "antd";
import Navbar from "@/components/navbar";

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

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [reviewText, setReviewText] = useState("");

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
        try {
            const rawUserId = sessionStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${reviewId}/ignore`, {});
            message.success("Review ignored.");
            fetchReviews();
        } catch (error) {
            message.error("Failed to ignore review.");
        }
    };

    const submitReview = async () => {
        if (!reviewText.trim()) return message.warning("Please enter a review.");
        if (!pendingReview) return;

        try {
            const rawUserId = sessionStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${pendingReview.id}/write`, {text: reviewText});
            message.success("Review submitted!");
            setIsModalVisible(false);
            setReviewText("");
            fetchReviews();
        } catch (error) {
            message.error("Failed to submit review.");
        }
    };

    return (
        <AuthWrapper>
            <div style={{maxWidth: '800px', margin: '40px auto', padding: '0 20px'}}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <Title level={2} style={{margin: 0}}>Review History</Title>
                    <Button onClick={() => router.back()}>Back</Button>
                </div>

                <Card>
                    <List
                        loading={loading}
                        dataSource={doneReviews}
                        locale={{emptyText: "You have no review history yet. Finish some tasks to see them here!"}}
                        renderItem={(review) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={
                                        <span>
                                        @{review.receiverUsername || 'User'}
                                            {review.reviewStatus === 'IGNORED' ? (
                                                <Tag color="default" style={{marginLeft: '8px'}}>Ignored</Tag>
                                            ) : (
                                                <Tag color="green" style={{marginLeft: '8px'}}>Written</Tag>
                                            )}
                                    </span>
                                    }
                                    description={
                                        <div>
                                            <Text type="secondary"
                                                  style={{display: 'block'}}>Task: {review.inseratDescription}</Text>
                                            {review.text && <Text italic>&quot;{review.text}&quot;</Text>}
                                        </div>
                                    }
                                />
                                <div style={{color: '#888'}}>{review.creationDate}</div>
                            </List.Item>
                        )}
                    />
                </Card>
                <Navbar id={userId} isVolunteer={isVolunteer} />
            </div>
        </AuthWrapper>
    );
}