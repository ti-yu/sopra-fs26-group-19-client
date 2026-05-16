'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from "next/script";
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Form, Input, Button, Radio, Select } from "antd";
import imageCompression from 'browser-image-compression';


interface PlaceSuggestion {
    placePrediction: {
        text: { text: string };
        toPlace: () => PlaceResult;
    };
}

interface PlaceResult {
    fetchFields: (options: { fields: string[] }) => Promise<void>;
    formattedAddress: string;
}

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
    profilePicture?: string | null;
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

    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProfileFile = async (file: File) => {
        if (!file.type.startsWith("image/")) return;

        const compressed = await imageCompression(file, {
            maxSizeMB: 0.1,        // compress to max 100KB
            maxWidthOrHeight: 256, // profile pictures don't need to be large
        });

        const reader = new FileReader();
        reader.onload = (e) => setProfilePicture(e.target?.result as string);
        reader.readAsDataURL(compressed);
        };

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

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
                    gender: data.gender || undefined,
                    address: data.address || '',
                    bio: data.bio || '',
                    password: data.password || '',
                    isVolunteer: data.isVolunteer || false
                });

                if (data.profilePicture) {
                    setProfilePicture(data.profilePicture);
                }

                if (data.address) {
                    setQuery(data.address);
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error("Failed to load profile data:", error.message);
                }
            }
        }

        fetchUserData();
    }, [form]);

    const fetchSuggestions = async (input: string) => {
        if (!input || !window.google) return;
        const { AutocompleteSuggestion } =
            (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;

        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ["ch"],
        });
        setSuggestions((response.suggestions || []) as unknown as PlaceSuggestion[]);
    };

    const handleSelectAddress = async (suggestion: PlaceSuggestion) => {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({ fields: ["formattedAddress"] });

        setQuery(place.formattedAddress);
        form.setFieldValue("address", place.formattedAddress);
        setSuggestions([]);
    };

    const handleFinish = async (values: SettingsFormValues) => {
        try {
            const rawUserId = sessionStorage.getItem('userId');
            if (!rawUserId) {
                message.error("You must be logged in to update your profile!");
                return;
            }

            const cleanUserId = rawUserId.replace(/"/g, '');

            await api.put(`/profile/${cleanUserId}`, { ...values, profilePicture: profilePicture ?? null });

            sessionStorage.setItem('isVolunteer', JSON.stringify(values.isVolunteer));

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
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=beta`}
                strategy="afterInteractive"
            />
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
                        {/* Profile Picture */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                            <div
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleProfileFile(f); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: isDragging ? "3px dashed #1890ff" : "3px dashed #d9d9d9",
                                    position: "relative",
                                    transition: "border-color 0.2s",
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={profilePicture ?? "/default_pb.png"}
                                    alt="Profile"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(0,0,0,0.45)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: isDragging ? 1 : 0,
                                    transition: "opacity 0.2s",
                                    color: "#fff",
                                    fontSize: 12,
                                    textAlign: "center",
                                    padding: 8,
                                }}>
                                    Drop image
                                </div>
                            </div>
                            <span style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
                                Drag & drop or click to upload
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProfileFile(f); }}
                            />
                        </div>

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
                            <Select placeholder="Select gender" allowClear>
                                <Select.Option value="Male">Male</Select.Option>
                                <Select.Option value="Female">Female</Select.Option>
                                <Select.Option value="Other">Other</Select.Option>
                                <Select.Option value="Prefer not to say">Prefer not to say</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="address"
                            label="Address"
                        >
                            <div style={{ position: "relative" }}>
                                <Input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        form.setFieldValue("address", e.target.value);
                                        fetchSuggestions(e.target.value);
                                    }}
                                    placeholder="Enter address"
                                />
                                {suggestions.length > 0 && (
                                    <div style={{
                                        position: "absolute", top: "100%", left: 0, right: 0,
                                        background: "#fff", border: "1px solid #d9d9d9",
                                        borderRadius: "6px", zIndex: 1000, maxHeight: "200px", overflowY: "auto",
                                        marginTop: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                    }}>
                                        {suggestions.map((item, index) => (
                                            <div
                                                key={index}
                                                style={{ padding: "8px 12px", cursor: "pointer" }}
                                                onClick={() => handleSelectAddress(item)}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                            >
                                                {item.placePrediction.text.text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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