'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Input, message, Button, Rate } from 'antd';
import Link from 'next/link';
import { ApiService } from '@/api/apiService';

const api = new ApiService();

interface PendingReview {
    id: string;
    receiverId?: string;
    receiverUsername?: string;
    inseratDescription?: string;
}

/**
 * Popup that asks the user to write a review for a finished help request.
 * Buttons:
 *  - "Ignore for now" : POST .../dismiss-for-now (server pushes reminder out 24h)  (#151)
 *  - "Ignore forever" : POST .../ignore (marks review IGNORED, never re-appears)
 *  - "Submit Review"  : POST .../write   (writes text + stars rating)            (#132)
 */
export default function ReviewModal({ userId }: { userId: string }) {
    const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [stars, setStars] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        async function checkForPendingReviews() {
            if (!userId) return;
            try {
                const response = await api.get<PendingReview>(`/profile/${userId}/pendingReview`);
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
    }, [userId]);

    const submitReview = async () => {
        if (stars <= 0) {
            message.warning("Please pick a star rating!");
            return;
        }
        if (!reviewText.trim()) {
            message.warning("Please write a short review!");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/profile/${userId}/reviews/${pendingReview?.id}/write`, {
                text: reviewText,
                stars,
            });
            message.success("Review posted successfully!");
            setIsModalOpen(false);
            setPendingReview(null);
        } catch {
            message.error("Failed to post review. Maximum 100 characters allowed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // #151: "Ignore for now" now hits the server. popup re-appears in 24h.
    const dismissForNow = async () => {
        if (!pendingReview) return;
        setIsSubmitting(true);
        try {
            await api.post(`/profile/${userId}/reviews/${pendingReview.id}/dismiss-for-now`, {});
        } catch (error) {
            // Failing the network call shouldn't block the user from closing the modal.
            console.error("Failed to dismiss review for now", error);
        } finally {
            setIsModalOpen(false);
            setPendingReview(null);
            setIsSubmitting(false);
        }
    };

    const ignoreForever = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/profile/${userId}/reviews/${pendingReview?.id}/ignore`, {});
            setIsModalOpen(false);
            setPendingReview(null);
        } catch {
            message.error("Failed to ignore review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pendingReview) return null;

    // Build the title node so the username (if linkable) becomes a clickable profile link.
    const titleNode = (
        <span>
            Review your experience with{' '}
            {pendingReview.receiverId ? (
                <Link
                    href={`/profile/${pendingReview.receiverId}`}
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                    @{pendingReview.receiverUsername}
                </Link>
            ) : (
                <span>@{pendingReview.receiverUsername}</span>
            )}
        </span>
    );

    return (
        <Modal
            title={titleNode}
            open={isModalOpen}
            closable={false}
            maskClosable={false}
            footer={[
                <div style={{display: 'flex', gap: '10px', flexDirection: 'column', justifyContent: 'center'}}>
                    <Button key="dismiss" onClick={dismissForNow} disabled={isSubmitting} style={{marginTop: "30px" }}>
                        Ignore for now
                    </Button>
                    <Button key="ignore" onClick={ignoreForever} disabled={isSubmitting} loading={isSubmitting}>
                        Ignore forever
                    </Button>
                    <Button key="submit" type="primary" onClick={submitReview} loading={isSubmitting}>
                        Submit Review
                    </Button>
                </div>
            ]}
        >
            <div style={{ marginBottom: '15px' }}>
                <p>The task <strong>{pendingReview.inseratDescription}</strong> has finished!</p>
                <p>Please rate your experience and write a short public review to help build trust in our community (max 100 characters):</p>
            </div>

            <div style={{ marginBottom: 12 }}>
                <Rate
                    allowHalf
                    value={stars}
                    onChange={setStars}
                    aria-label="Star rating, half-step from 0.5 to 5"
                    disabled={isSubmitting}
                />
                {stars > 0 && (
                    <span style={{ marginLeft: 12, color: "#555" }}>{stars.toFixed(1)} / 5</span>
                )}
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
