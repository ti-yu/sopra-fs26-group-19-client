"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Form, Input, DatePicker, Select, TimePicker, message } from "antd"; // ✅ removed unused List
import dayjs from "dayjs";
import Navbar from "@/components/navbar";
import Script from "next/script";
import { useState } from "react";// ✅ removed unused useEffect
import AuthWrapper from "@/components/AuthWrapper";

// ✅ defined types instead of using any
interface PlaceSuggestion {
  placePrediction: {
    text: { text: string };
    toPlace: () => PlaceResult;
  };
}

interface PlaceResult {
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  formattedAddress: string;
  location: {
    lat: () => number;
    lng: () => number;
  };
}

type HelpRequestFormValues = {
  description: string;
  date: dayjs.Dayjs;
  time: dayjs.Dayjs;
  timeframe: string;
  workType: string;
};

const CreateHelpRequest: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]); // ✅ typed
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null); // ✅ typed

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

  const handleSelect = async (suggestion: PlaceSuggestion) => { // ✅ typed
    const place = suggestion.placePrediction.toPlace();

    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });

    setSelectedPlace(place);
    setQuery(place.formattedAddress);
    form.setFieldValue("location", place.formattedAddress);
    setSuggestions([]);
  };

  const handleSubmit = async (values: HelpRequestFormValues) => {
    try {
      if (!selectedPlace || !selectedPlace.location) {
        message.error("Please select a valid address from the dropdown!");
        return;
      }

      const payload = {
        recipientId: userId,
        description: values.description,
        date: values.date ? values.date.format("YYYY-MM-DD") : null,
        time: values.time ? values.time.format("HH:mm") : null,
        timeframe: values.timeframe,
        location: selectedPlace.formattedAddress,
        latitude: selectedPlace.location.lat(),
        longitude: selectedPlace.location.lng(),
        workType: values.workType,
      };

      await apiService.post("/help-requests", payload);
      router.push(`/my-requests`);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } }; status?: number; message?: string };

      if (err.response?.status === 400 || err.status === 400) {
        message.error("Please make sure all fields are filled out correctly.");
      } else {
        message.error("Failed to post request. Please try again later.");
      }
    }
  };

  const handleFailedSubmit = () => {
    message.error("Please fill out all required Fields")
  }

  return (
      <AuthWrapper>
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=beta`}
        strategy="afterInteractive"
      />

      <div className="login-container">
        <div className="auth-card" style={{ height: "auto", minHeight: "500px", paddingBottom: "80px" }}>

          <div className="auth-card-header">
            <button type="button" className="header-link" onClick={() => router.back()}>
              Cancel
            </button>
            <h1>Get Help!</h1>
          </div>

          <Form
            form={form}
            name="create-help-request"
            size="large"
            variant="outlined"
            onFinish={handleSubmit}
            onFinishFailed={handleFailedSubmit}
            scrollToFirstError
            layout="vertical"
          >
            <Form.Item
              name="description"
              label="Title"
              rules={[{ required: true, message: "Please enter a description!" }]}
            >
              <Input.TextArea
                placeholder="short description and requirements"
                maxLength={255}
                showCount
                rows={4}
              />
            </Form.Item>

            <Form.Item
                name="workType"
                label="Type of Work"
                rules={[{ required: true, message: "Please select a category!" }]}
            >
              <Select placeholder="Select category">
                <Select.Option value="GARDENING">🌻 Gardening</Select.Option>
                <Select.Option value="SHOPPING">🛒 Shopping & Groceries</Select.Option>
                <Select.Option value="HEAVY_LIFTING">💪 Heavy Lifting</Select.Option>
                <Select.Option value="IT_SUPPORT">💻 IT Support</Select.Option>
                <Select.Option value="TUTORING">📚 Tutoring</Select.Option>
                <Select.Option value="TRANSPORT">🚗 Transport</Select.Option>
                <Select.Option value="CLEANING">🧹 Cleaning</Select.Option>
                <Select.Option value="OTHER">✨ Other</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: "Please select a date!" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD.MM.YYYY"
                placeholder="Date: DD.MM.YYYY"
              />
            </Form.Item>

            <Form.Item
                name="time"
                label="Time of Day"
                
            >
              <TimePicker
                  format="HH:mm"
                  style={{ width: "100%" }}
                  placeholder="Select time (HH:mm)"
              />
            </Form.Item>

            <Form.Item
            name="timeframe"
            label="Duration (hours)"
            rules={[{ required: true, message: "Please select a duration!" }]}
          >
              <Select placeholder="Select duration">
                {Array.from({ length: 17 }, (_, i) => (i+1) * 0.5).map(value => (
                  <Select.Option key={value} value={String(value)}>
                    {value === 0.5 ? "30 min" : value === 8.5 ? ">8 hours" : `${value} hour${value !== 1 ? "s" : ""}`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: "Please select an address from the dropdown!" }]}
            >
              <div style={{ position: "relative" }}>
                <Input
                  value={query}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuery(value);
                    form.setFieldValue("location", value);
                    fetchSuggestions(value);
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
                      marginTop: "4px",
                      zIndex: 1000,
                      maxHeight: "200px",
                      overflowY: "auto",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {suggestions.map((item, index) => (
                      <div
                        key={index}
                        role="option"
                        aria-selected={false}
                        tabIndex={0}
                        onClick={() => handleSelect(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelect(item);
                          }
                        }}
                        style={{ padding: "8px 12px", cursor: "pointer" }}
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

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                post request online
              </Button>
            </Form.Item>
          </Form>
        </div>

        <Navbar id={userId} isVolunteer={isVolunteer} />
      </div>
    </>
        </AuthWrapper>
  );
};

export default CreateHelpRequest;