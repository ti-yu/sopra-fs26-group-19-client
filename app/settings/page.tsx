'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from "next/script";
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";
import { message, Form, Input, Button, Radio, Select, DatePicker } from "antd";
import dayjs from "dayjs";
import imageCompression from 'browser-image-compression';
import { useRole } from "@/components/ThemeProvider";


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
    isVolunteer?: boolean;
    profilePicture?: string | null;
}

/**
 * Form shape kept separate from `UserProfileData` because antd DatePicker
 * hands us a dayjs object, not a string. Password fields are not part of the
 * main update payload anymore (they go to /change-password).
 */
type SettingsFormValues = {
    surname?: string;
    lastname?: string;
    username?: string;
    emailAddress?: string;
    phoneNumber?: string;
    dateOfBirth?: dayjs.Dayjs;
    gender?: string;
    address?: string;
    bio?: string;
    isVolunteer: boolean;
};

const api = new ApiService();

export default function SettingsPage() {
    const router = useRouter();
    const [form] = Form.useForm<SettingsFormValues>();

    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isVolunteer, setIsVolunteer } = useRole();

    // Password-change has its own little sub-form; keeps state out of the main form.
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Theme follows the role toggle live (#10 polish). same pattern as registration.
    const watchedIsVolunteer = Form.useWatch("isVolunteer", form);
    useEffect(() => {
        if (typeof watchedIsVolunteer === "boolean") {
            setIsVolunteer(watchedIsVolunteer);
        }
    }, [watchedIsVolunteer, setIsVolunteer]);

    const handleProfileFile = async (file: File) => {
        if (!file.type.startsWith("image/")) return;
    
        if (file.size > 10*1024*1024) { //i.e. 10MB
          message.error("Profile picture must be smaller than 10MB.");
        return;
        }

        const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 256 });
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
                    dateOfBirth: data.dateOfBirth ? dayjs(data.dateOfBirth) : undefined,
                    gender: data.gender || undefined,
                    address: data.address || '',
                    bio: data.bio || '',
                    isVolunteer: data.isVolunteer ?? false,
                });

                if (data.profilePicture) setProfilePicture(data.profilePicture);
                if (data.address) setQuery(data.address);
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

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            message.error("Please fill in both password fields.");
            return;
        }
        if (newPassword.length < 6) {
            message.error("New password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            message.error("New password and confirmation don't match.");
            return;
        }
        const rawUserId = sessionStorage.getItem('userId');
        if (!rawUserId) {
            message.error("You must be logged in to change your password!");
            return;
        }
        const cleanUserId = rawUserId.replace(/"/g, '');
        setIsChangingPassword(true);
        try {
            await api.post(`/profile/${cleanUserId}/change-password`, {
                oldPassword,
                newPassword,
            });
            message.success("Password updated.");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            const err = error as { response?: { status?: number }; status?: number };
            const status = err.response?.status ?? err.status;
            if (status === 401) {
                message.error("Current password is incorrect.");
            } else if (status === 400) {
                message.error("The new password is invalid (must be at least 6 characters).");
            } else {
                message.error("Failed to change password. Please try again.");
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleFinish = async (values: SettingsFormValues) => {
        try {
            const rawUserId = sessionStorage.getItem('userId');
            if (!rawUserId) {
                message.error("You must be logged in to update your profile!");
                return;
            }
            const cleanUserId = rawUserId.replace(/"/g, '');

            // Password is NOT included in the main update payload anymore. the
            // /change-password endpoint handles it (so the old password is
            // verified). Strip the dayjs date back into the server's format.
            const payload = {
                ...values,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : null,
                profilePicture: profilePicture ?? null,
            };

            await api.put(`/profile/${cleanUserId}`, payload);
            setIsVolunteer(values.isVolunteer);
            sessionStorage.setItem("isVolunteer", String(values.isVolunteer));

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
            <div className="login-container" style={{ "--role-color": isVolunteer ? "#53beb3" : "#d9737d" } as React.CSSProperties}>
                <div className="auth-card" style={{ height: 'auto', minHeight: 'auto', padding: '30px 20px', maxWidth: '450px' }}>

                    <div className="auth-card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="header-link"
                            style={{ left: 0, position: 'absolute', cursor: 'pointer', color: 'var(--role-color)' }}
                            onClick={() => router.back()}
                        >
                            <strong>Cancel</strong>
                        </button>
                        <h1 style={{ fontSize: '28px', lineHeight: '1.2', maxWidth: '200px', textAlign: 'center' }}>
                            Update user profile details
                        </h1>
                    </div>

                    <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                        Fields marked with <span style={{ color: "#e53935" }}>*</span> are required.
                    </p>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFinish}
                        size="large"
                        className="auth-form"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                            const current = document.activeElement as HTMLElement;

                            // Allow normal form submission when focused on submit button
                            if (
                                current instanceof HTMLButtonElement &&
                                current.type === "submit"
                            ) {
                                return;
                            }

                            e.preventDefault();

                            const focusable = Array.from(
                                document.querySelectorAll<HTMLElement>(
                                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                                )
                            ).filter(el => !el.hasAttribute("disabled"));

                            const idx = focusable.indexOf(current);

                            if (idx !== -1 && idx < focusable.length - 1) {
                                focusable[idx + 1].focus();
                            }
                            }
                        }}
                    >
                        {/* Profile Picture */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                            <div
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleProfileFile(f); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                                role="button"
                                tabIndex={0}
                                aria-label="Upload profile picture"
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
                                    alt="Your profile picture"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                                <div style={{
                                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    opacity: isDragging ? 1 : 0, transition: "opacity 0.2s",
                                    color: "#fff", fontSize: 12, textAlign: "center", padding: 8,
                                }}>
                                    Drop image
                                </div>
                            </div>
                            <span style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                                Drag &amp; drop or click to upload
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProfileFile(f); }}
                            />
                        </div>

                        {/* --- Field order mirrors the Registration page --- */}

                        <Form.Item name="username" label="Username">
                            <Input placeholder="Enter username" />
                        </Form.Item>

                        <Form.Item name="surname" label="First Name">
                            <Input placeholder="Enter first name" />
                        </Form.Item>

                        <Form.Item name="lastname" label="Last Name">
                            <Input placeholder="Enter last name" />
                        </Form.Item>

                        <Form.Item name="emailAddress" label="Email Address">
                            <Input type="email" placeholder="Enter email address" />
                        </Form.Item>

                        <Form.Item name="bio" label="Bio">
                            <Input.TextArea placeholder="Introduce yourself!" rows={4} style={{ resize: 'none' }} maxLength={200} showCount />
                        </Form.Item>

                        <Form.Item name="address" label="Address">
                            <div style={{ position: "relative" }}>
                                <Input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        form.setFieldValue("address", e.target.value);
                                        fetchSuggestions(e.target.value);
                                    }}
                                    placeholder="Enter address"
                                    aria-label="Address"
                                />
                                {suggestions.length > 0 && (
                                    <div
                                        role="listbox"
                                        style={{
                                            position: "absolute", top: "100%", left: 0, right: 0,
                                            background: "#fff", border: "1px solid #d9d9d9",
                                            borderRadius: "6px", zIndex: 1000, maxHeight: "200px", overflowY: "auto",
                                            marginTop: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                        }}
                                    >
                                        {suggestions.map((item, index) => (
                                            <div
                                                key={index}
                                                role="option"
                                                aria-selected={false}
                                                tabIndex={0}
                                                onClick={() => handleSelectAddress(item)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        handleSelectAddress(item);
                                                    }
                                                }}
                                                style={{ padding: "8px 12px", cursor: "pointer" }}
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

                        <Form.Item name="gender" label="Gender">
                            <Select placeholder="Select gender" allowClear>
                                <Select.Option value="Male">Male</Select.Option>
                                <Select.Option value="Female">Female</Select.Option>
                                <Select.Option value="Other">Other</Select.Option>
                                <Select.Option value="Prefer not to say">Prefer not to say</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="phoneNumber"
                            label="Phone Number"
                            rules={[
                            {
                                pattern: /^\+41\s\d{2}\s\d{3}\s\d{4}$/,
                                message: "Use format: +41 76 123 4567",
                            },
                            ]}
                        >
                            <Input
                            placeholder="+41 76 123 4567"
                            onFocus={(e) => {
                                if (!e.target.value) {
                                form.setFieldValue("phoneNumber", "+41 ");
                                }
                            }}
                            onBlur={(e) => {
                                // Reset to empty if user didn't type a number
                                if (e.target.value.trim() === "+41") {
                                form.setFieldValue("phoneNumber", "");
                                }
                            }}
                            onChange={(e) => {
                                let value = e.target.value;

                                // Always enforce +41 prefix
                                if (!value.startsWith("+41 ")) {
                                value = "+41 ";
                                }

                                // Remove everything except digits after +41
                                const digits = value
                                .replace("+41 ", "")
                                .replace(/\D/g, "")
                                .slice(0, 9);

                                // Format as: 76 123 4567
                                let formatted = "+41 ";

                                if (digits.length > 0) {
                                formatted += digits.slice(0, 2);
                                }

                                if (digits.length >= 3) {
                                formatted += " " + digits.slice(2, 5);
                                }

                                if (digits.length >= 6) {
                                formatted += " " + digits.slice(5, 9);
                                }

                                form.setFieldValue("phoneNumber", formatted);
                            }}
                            />
                        </Form.Item>

                        <Form.Item name="dateOfBirth" label="Date of Birth">
                            <DatePicker 
                                style={{ width: "100%" }}
                                format="DD.MM.YYYY"
                                placeholder="DD.MM.YYYY"
                                onChange={(date) => form.setFieldValue("dateOfBirth", date)}
                                inputReadOnly={false}
                            />
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
                                    borderRadius: '25px',
                                    height: '54px',
                                    fontSize: '18px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Update Profile
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* --- Separate sub-form for the password change flow --- */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #eee" }}>
                        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Change password</h2>
                        <p style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
                            Enter your current password and a new one (at least 6 characters).
                        </p>
                        <Input.Password
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Current password"
                            autoComplete="current-password"
                            style={{ marginBottom: 8 }}
                        />
                        <Input.Password
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            autoComplete="new-password"
                            style={{ marginBottom: 8 }}
                        />
                        <Input.Password
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            autoComplete="new-password"
                            style={{ marginBottom: 12 }}
                        />
                        <Button
                            type="default"
                            block
                            loading={isChangingPassword}
                            onClick={handleChangePassword}
                            style={{ borderRadius: '25px', height: '48px', fontWeight: "bold" }}
                        >
                            Update password
                        </Button>
                    </div>

                </div>
            </div>
        </AuthWrapper>
    );
}
