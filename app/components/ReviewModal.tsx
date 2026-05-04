'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Input, message } from 'antd';
import { ApiService } from '@/api/apiService';

const api = new ApiService();

interface PendingReview {
    id: string;
    receiverUsername?: string;
    inseratDescription?: string;
}

export default function ReviewModal() {
    const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkForPendingReviews() {
            try {
                const rawUserId = localStorage.getItem('userId');
                if (!rawUserId) return;
                const cleanUserId = rawUserId.replace(/"/g, '');

                const response = await api.get<PendingReview>(`/profile/${cleanUserId}/pendingReview`);

                if (response && response.id) {
                    setPendingReview(response);
                    setIsModalOpen(true);
                }
            } catch (error: unknown) {
                const apiError = error as { response?: { status?: number } };

                if (apiError.response?.status !== 204) {
                    console.error("Failed to check for pending reviews:", error);
                }
            }
        }

        checkForPendingReviews();

        //checks every 60s if review is nesessary
        const intervalId = setInterval(() => {
            if (!isModalOpen) checkForPendingReviews();
        }, 60000);

        return () => clearInterval(intervalId);
    }, [isModalOpen]);

    const submitReview = async () => {
        if (!reviewText.trim()) {
            message.warning("Please write a short review!");
            return;
        }

        setIsSubmitting(true);
        try {
            const rawUserId = localStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${pendingReview?.id}/write`, { text: reviewText });

            message.success("Review posted successfully!");
            setIsModalOpen(false);
            setPendingReview(null);
        } catch (error) {
            message.error("Failed to post review. Maximum 100 characters allowed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const ignoreReview = async () => {
        setIsSubmitting(true);
        try {
            const rawUserId = localStorage.getItem('userId')?.replace(/"/g, '');
            await api.post(`/profile/${rawUserId}/reviews/${pendingReview?.id}/ignore`, {});

            setIsModalOpen(false);
            setPendingReview(null);
        } catch (error) {
            message.error("Failed to ignore review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pendingReview) return null;

    return (
        <Modal
            title={`Review your experience with @${pendingReview.receiverUsername}`}
            open={isModalOpen}
            onOk={submitReview}
            onCancel={ignoreReview}
            okText="Submit Review"
            cancelText="Ignore for now"
            closable={false}
            maskClosable={false}
            confirmLoading={isSubmitting}
            cancelButtonProps={{ disabled: isSubmitting }}
        >
            <div style={{ marginBottom: '15px' }}>
                <p>The task <strong>{pendingReview.inseratDescription}</strong> has finished!</p>
                <p>Please write a short public review to help build trust in our community (max 100 characters):</p>
            </div>

            <Input.TextArea
                rows={4}
                maxLength={100}
                showCount
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="They were fantastic and very helpful..."
                disabled={isSubmitting}
            />
        </Modal>
    );
}