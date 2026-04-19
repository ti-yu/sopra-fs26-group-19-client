'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/api/apiService';
import AuthWrapper from "@/components/AuthWrapper";

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

const api = new ApiService();

export default function SettingsPage() {
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        surname: '',
        lastname: '',
        username: '',
        emailAddress: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        bio: '',
        password: '',
        isVolunteer: false
    });

    //userdata holen und denn ihfülle
    useEffect(() => {
        async function fetchUserData() {
            try {
                const rawUserId = sessionStorage.getItem('userId');
                if (!rawUserId) return;
                const cleanUserId = rawUserId.replace(/"/g, '');
                const data = await api.get<UserProfileData>(`/profile/${cleanUserId}`);

                setFormData({
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
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleRoleChange = (isVolunteer: boolean) => {
        setFormData((prev) => ({...prev, isVolunteer}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const rawUserId = sessionStorage.getItem('userId');
            if (!rawUserId) {
                alert("You must be logged in!");
                return;
            }

            const cleanUserId = rawUserId.replace(/"/g, '');

            await api.put(`/profile/${cleanUserId}`, formData);

            alert("Profile updated successfully!");
            router.push(`/profile/${cleanUserId}`);

        } catch (error) {
            if (error instanceof Error) {
                alert(`Failed to update profile: \n${error.message}`);
            }
        }
    };

        const inputStyle: React.CSSProperties = {
            backgroundColor: 'var(--input-bg, #f5f5f5)',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 16px',
            fontSize: '16px',
            width: '100%',
            marginBottom: '12px',
            color: 'var(--foreground, #171717)',
            fontFamily: 'inherit'
        };

        const radioContainerStyle: React.CSSProperties = {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            fontSize: '15px',
            fontWeight: 500,
            color: '#666'
        };

        return (
            <AuthWrapper>
            <div className="login-container">
                <div className="auth-card"
                     style={{height: 'auto', minHeight: 'auto', padding: '30px 20px', maxWidth: '450px'}}>

                    {/* Header */}
                    <div className="auth-card-header"
                         style={{marginBottom: '20px', display: 'flex', justifyContent: 'center'}}>
                    <span
                        className="header-link"
                        style={{color: 'var(--primary)', left: 0, position: 'absolute', cursor: 'pointer'}}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </span>
                        <h1 style={{fontSize: '28px', lineHeight: '1.2', maxWidth: '200px', textAlign: 'center'}}>
                            Update user profile details
                        </h1>
                    </div>

                    {/* The Form */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <input style={inputStyle} type="text" name="surname" placeholder="First Name"
                               value={formData.surname} onChange={handleInputChange}/>
                        <input style={inputStyle} type="text" name="lastname" placeholder="Last Name"
                               value={formData.lastname} onChange={handleInputChange}/>
                        <input style={inputStyle} type="text" name="username" placeholder="Username"
                               value={formData.username} onChange={handleInputChange}/>
                        <input style={inputStyle} type="email" name="emailAddress" placeholder="Email Address"
                               value={formData.emailAddress} onChange={handleInputChange}/>
                        <input style={inputStyle} type="text" name="phoneNumber" placeholder="Phone Number"
                               value={formData.phoneNumber} onChange={handleInputChange}/>
                        <input style={inputStyle} type="date" name="dateOfBirth" value={formData.dateOfBirth}
                               onChange={handleInputChange}/>
                        <input style={inputStyle} type="text" name="gender" placeholder="Gender (e.g., f, m, other)"
                               value={formData.gender} onChange={handleInputChange}/>
                        <input style={inputStyle} type="text" name="address"
                               placeholder="Address (e.g., Zürichstrasse 248)" value={formData.address}
                               onChange={handleInputChange}/>

                        <textarea
                            style={{...inputStyle, resize: 'none', height: '100px'}}
                            name="bio"
                            placeholder="Introduce yourself!"
                            value={formData.bio}
                            onChange={handleInputChange}
                        />

                        {/* Password with Show/Hide Toggle */}
                        <div style={{position: 'relative'}}>
                            <input
                                style={inputStyle}
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="......"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                            <span
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '14px',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                            {showPassword ? "Hide" : "Show"}
                        </span>
                        </div>

                        {/* Role Selectors (Radios) */}
                        <div style={{marginTop: '10px', marginBottom: '20px'}}>
                            <label style={radioContainerStyle}>
                                I want to receive help (client)
                                <input
                                    type="radio"
                                    checked={!formData.isVolunteer}
                                    onChange={() => handleRoleChange(false)}
                                    style={{accentColor: 'var(--primary)', transform: 'scale(1.2)'}}
                                />
                            </label>
                            <label style={radioContainerStyle}>
                                I want to lend help (volunteer)
                                <input
                                    type="radio"
                                    checked={formData.isVolunteer}
                                    onChange={() => handleRoleChange(true)}
                                    style={{accentColor: 'var(--primary)', transform: 'scale(1.2)'}}
                                />
                            </label>
                        </div>

                        {/* Update Button */}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '25px',
                                padding: '16px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginTop: '10px'
                            }}
                        >
                            Update Data
                        </button>
                    </form>

                </div>
            </div>
                </AuthWrapper>
        );
}