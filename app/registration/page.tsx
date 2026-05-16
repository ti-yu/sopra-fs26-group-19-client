"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Radio, Input, DatePicker, Select, Switch, message } from "antd";
import dayjs from "dayjs";
import Script from "next/script";
import imageCompression from "browser-image-compression";

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

type RegisterFormValues = {
  username: string;
  surname: string;
  lastname: string;
  password: string;
  emailAddress: string;
  bio?: string;
  address?: string;
  gender?: string;
  phoneNumber?: string;
  dateOfBirth?: dayjs.Dayjs;
  isVolunteer: boolean;
};

const Register: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const { set: setToken } = useLocalStorage<string>("token", "");
  const { set: setUserId } = useLocalStorage<string>("userId", "");

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


  const handleRegister = async (values: RegisterFormValues) => {
    try {
      const cleanedValues = Object.entries(values).reduce((acc, [key, value]) => {
        acc[key] = (value === "" || value === undefined) ? null : value;
        return acc;
      }, {} as Record<string, unknown>);

      const payload = {
        ...cleanedValues,
        dateOfBirth: values.dateOfBirth
            ? values.dateOfBirth.format("YYYY-MM-DD")
            : null,
        profilePicture: profilePicture ?? null,
      };

      const created = await apiService.post<User>("/register", payload);

      const loginResponse = await apiService.post<User>("/login", {
        username: values.username,
        password: values.password,
      });

      if (!loginResponse.token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      setToken(loginResponse.token);
      setUserId(created.id);
      sessionStorage.setItem("isVolunteer", String(created.isVolunteer));

      router.push(`/profile/${created.id}`);
    } catch (error) {
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
        status?: number;
        message?: string
      };

      const backendMessage = (err.response?.data?.message || err.message || "").toLowerCase();

      if (err.response?.status === 409 || err.status === 409) {

        if (backendMessage.includes("username and email")) {
          message.error("Both this username and email are already taken.");
        } else if (backendMessage.includes("username")) {
          message.error("This username is already taken. Please choose another.");
        } else if (backendMessage.includes("email")) {
          message.error("This email address is already in use.");
        } else {
          // Absolute fallback just in case
          message.error("This username or email is already taken.");
        }
      }
      else if (err.response?.status === 400 || err.status === 400) {
        message.error("Please make sure all mandatory fields are filled out correctly.");
      }
      else if (backendMessage.includes("missing") || backendMessage.includes("required")) {
        message.error("Please make sure all mandatory fields are filled out correctly.");
      }
      else {
        message.error("An unknown error occurred. Please try again later.");
      }
    }
  };

  const handleFailedSubmit = () => {
    message.error("Please fill out all required fields correctly.");
  };

  return (
      <>
        <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=beta`}
            strategy="afterInteractive"
        />
    <div className="login-container">
      <div className="auth-card" style={{ height: "auto", minHeight: "500px" }}>

        {/* --- Header Section --- */}
        <div className="auth-card-header">
          <button type="button" className="header-link" onClick={() => router.push("/login")}>
            login
          </button>
          <h1>Registration</h1>
        </div>

        {/* --- Form Section --- */}
        <Form
          form={form}
          name="register"
          size="large"
          variant="outlined"
          onFinish={handleRegister}
          onFinishFailed={handleFailedSubmit}
          scrollToFirstError
          layout="vertical"
          initialValues={{ isVolunteer: false }}
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

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="surname"
            label="First Name"
            rules={[{ required: true, message: "Please input your first name!" }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            name="lastname"
            label="Last Name"
            rules={[{ required: true, message: "Please input your last name!" }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item
            name="emailAddress"
            label="Email Address"
            rules={[
              { required: true, message: "Please input your email address!" },
              { type: "email", message: "Please enter a valid email address!" },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item name="bio" label="Bio">
            <Input.TextArea placeholder="Short bio" maxLength={200} showCount />
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
              />
              {suggestions.length > 0 && (
                  <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #d9d9d9",
                        borderRadius: "6px",
                        zIndex: 1000,
                        maxHeight: "200px",
                        overflowY: "auto",
                        marginTop: "4px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                  >
                    {suggestions.map((item, index) => (
                        <div
                            key={index}
                            style={{ padding: "8px 12px", cursor: "pointer" }}
                            onClick={() => handleSelectAddress(item)}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f5f5f5")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                            }
                        >
                          {item.placePrediction.text.text}
                        </div>
                    ))}
                  </div>
              )}
            </div>
          </Form.Item>

          <Form.Item name="gender" label="Gender">
            <Select
              placeholder="Select gender"
              allowClear
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
                { value: "Prefer not to say", label: "Prefer not to say" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number">
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item name="dateOfBirth" label="Date of Birth">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="isVolunteer" label="Account Role">
              <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Radio value={false}>I want to receive help (client)</Radio>
                  <Radio value={true}>I want to lend help (volunteer)</Radio>
              </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Register
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="default" onClick={() => router.push("/login")} block>
              Back to Login
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
      </>
  );
};

export default Register;