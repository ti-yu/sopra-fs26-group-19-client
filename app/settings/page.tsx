'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Form, Input, Button, Radio } from "antd";

interface UserProfileData {
    surname?: string;
    lastname?: string;
    username?: string;
    emailAddress?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    bio?: string;
    password?: string;
    isVolunteer?: boolean;
}

type SettingsFormValues = {
    surname?: string;
    lastname?: string;
    username?: string;
    emailAddress?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    bio?: string;
    password?: string;
    isVolunteer: boolean;
};

const api = new ApiService();

export default function SettingsPage() {
    const router = useRouter();
    const [form] = Form.useForm();

    useEffect(() => {
        async function fetchUserData() {
            try {
                const rawUserId = sessionStorage.getItem('userId');
                if (!rawUserId) return;
                const cleanUserId = rawUserId.replace(/"/g, '');
                const data = await api.get<UserProfileData>(`/profile/${cleanUserId}`);

                form.setFieldsValue({
                    surname: data.surname || '',
                    lastname: data.lastname || '',
                    username: data.username || '',
                    emailAddress: data.emailAddress || '',
                    phoneNumber: data.phoneNumber || '',
                    dateOfBirth: data.dateOfBirth || '',
                    gender: data.gender || '',
                    address: data.address || '',
                    bio: data.bio || '',
                    password: data.password || '',
                    isVolunteer: data.isVolunteer || false
                });
            } catch (error) {
                if (error instanceof Error) {
                    console.error("Failed to load profile data:", error.message);
                }
            }
        }

        fetchUserData();
    }, [form]);

    const handleFinish = async (values: SettingsFormValues) => {
        try {
            const rawUserId = sessionStorage.getItem('userId');
            if (!rawUserId) {
                message.error("You must be logged in to update your profile!");
                return;
            }

            const cleanUserId = rawUserId.replace(/"/g, '');

            await api.put(`/profile/${cleanUserId}`, values);

            message.success("Profile updated successfully!");
            router.push(`/profile/${cleanUserId}`);

        } catch (error) {
            const err = error as { response?: { status?: number; data?: { message?: string } }; status?: number; message?: string };
            const backendMessage = (err.response?.data?.message || err.message || "").toLowerCase();

            if (err.response?.status === 409 || err.status === 409) {
                if (backendMessage.includes("username")) {
                    message.error("This username is already taken. Please choose another.");
                } else if (backendMessage.includes("email")) {
                    message.error("This email address is already in use.");
                } else {
                    message.error("This username or email is already taken.");
                }
            } else if (err.response?.status === 400 || err.status === 400) {
                message.error("Please make sure all fields are filled out correctly.");
            } else {
                message.error("Failed to update profile. Please try again later.");
            }
        }
    };

    return (
        <AuthWrapper>
            <div className="login-container">
                <div className="auth-card" style={{height: 'auto', minHeight: 'auto', padding: '30px 20px', maxWidth: '450px'}}>

                    <div className="auth-card-header" style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}>
                        <button
                            type="button"
                            className="header-link"
                            style={{color: 'var(--primary)', left: 0, position: 'absolute', cursor: 'pointer'}}
                            onClick={() => router.back()}
                        >
                            Cancel
                        </button>
                        <h1 style={{fontSize: '28px', lineHeight: '1.2', maxWidth: '200px', textAlign: 'center'}}>
                            Update user profile details
                        </h1>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFinish}
                        size="large"
                        className="auth-form"
                    >
                        <Form.Item name="surname" label="First Name">
                            <Input placeholder="First Name" />
                        </Form.Item>

                        <Form.Item name="lastname" label="Last Name">
                            <Input placeholder="Last Name" />
                        </Form.Item>

                        <Form.Item name="username" label="Username">
                            <Input placeholder="Username" />
                        </Form.Item>

                        <Form.Item name="emailAddress" label="Email Address">
                            <Input type="email" placeholder="Email Address" />
                        </Form.Item>

                        <Form.Item name="phoneNumber" label="Phone Number">
                            <Input placeholder="Phone Number" />
                        </Form.Item>

                        <Form.Item name="dateOfBirth" label="Date of Birth">
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item name="gender" label="Gender">
                            <Input placeholder="Gender (e.g., f, m, other)" />
                        </Form.Item>

                        <Form.Item name="address" label="Address">
                            <Input placeholder="Address (e.g., Zürichstrasse 248)" />
                        </Form.Item>

                        <Form.Item name="bio" label="Bio">
                            <Input.TextArea placeholder="Introduce yourself!" rows={4} style={{ resize: 'none' }} />
                        </Form.Item>

                        <Form.Item name="password" label="Password">
                            <Input.Password placeholder="......" />
                        </Form.Item>

                        <Form.Item name="isVolunteer" label="Account Role">
                            <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <Radio value={false}>I want to receive help (client)</Radio>
                                <Radio value={true}>I want to lend help (volunteer)</Radio>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, marginTop: '20px' }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                style={{
                                    backgroundColor: 'var(--primary)',
                                    borderRadius: '25px',
                                    height: '54px',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Update Data
                            </Button>
                        </Form.Item>
                    </Form>

                </div>
            </div>
        </AuthWrapper>
    );
}