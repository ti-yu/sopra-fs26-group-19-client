"use client";

import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Form, Input, DatePicker, Select, TimePicker, Spin } from "antd";
import dayjs from "dayjs";
import Navbar from "@/components/navbar";
import Script from "next/script";
import { useEffect, useState } from "react";
import AuthWrapper from "@/components/AuthWrapper";
import { Inserat } from "@/types/inserat";

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

type EditFormValues = {
  description: string;
  date: dayjs.Dayjs;
  time: dayjs.Dayjs;
  timeframe: string;
  workType: string;
};

const EditHelpRequest: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const inseratId = params?.id as string;
  const apiService = useApi();
  const [form] = Form.useForm();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ location: string; latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!inseratId) return;
    const fetchInserat = async () => {
      try {
        const data = await apiService.get<Inserat>(`/help-requests/${inseratId}`);
        form.setFieldsValue({
          description: data.description,
          date: data.date ? dayjs(data.date) : undefined,
          time: data.time ? dayjs(data.time, "HH:mm") : undefined,
          timeframe: data.timeframe,
          workType: data.workType,
        });
        setQuery(data.location);
        setInitialLocation({
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } catch (err) {
        console.error("Failed to load help request", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInserat();
  }, [inseratId]);

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

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });
    setSelectedPlace(place);
    setQuery(place.formattedAddress);
    setSuggestions([]);
  };

  const handleSubmit = async (values: EditFormValues) => {
    try {
      const location = selectedPlace
        ? {
            location: selectedPlace.formattedAddress,
            latitude: selectedPlace.location.lat(),
            longitude: selectedPlace.location.lng(),
          }
        : initialLocation;

      if (!location) {
        alert("Please select a valid address!");
        return;
      }

      const payload = {
        recipientId: userId,
        description: values.description,
        date: values.date ? values.date.format("YYYY-MM-DD") : null,
        time: values.time ? values.time.format("HH:mm") : null,
        timeframe: values.timeframe,
        location: location.location,
        latitude: location.latitude,
        longitude: location.longitude,
        workType: values.workType,
      };

      await apiService.put(`/help-requests/${inseratId}`, payload);
      router.push(`/my-requests`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong:\n${error.message}`);
      } else {
        console.error("An unknown error occurred.");
      }
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      </AuthWrapper>
    );
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
                <strong>Cancel</strong>
              </button>
              <h1>Edit Request</h1>
            </div>

            <Form
              form={form}
              name="edit-help-request"
              size="large"
              variant="outlined"
              onFinish={handleSubmit}
              layout="vertical"
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
                  disabledDate={(current) => current && current < dayjs().startOf("day")}
                  onChange={(date) => form.setFieldValue("date", date)}
                  inputReadOnly={false}
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
                  disabledTime={() => {
                    const sel = form.getFieldValue("date") as dayjs.Dayjs | undefined;
                    if (!sel || !sel.isSame(dayjs(), "day")) return {};
                    const now = dayjs();
                    return {
                      disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
                      disabledMinutes: (h: number) =>
                        h === now.hour()
                          ? Array.from({ length: now.minute() }, (_, i) => i)
                          : [],
                    };
                  }}
                />
              </Form.Item>

              <Form.Item
                name="timeframe"
                label="Duration (hours)"
                rules={[{ required: true, message: "Please enter the duration!" }]}
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
                rules={[{ required: true, message: "Please select an address from the list!" }]}
              >
                <Select
                  showSearch
                  placeholder="Enter address, then pick a suggestion"
                  onSearch={(value) => {
                    form.setFieldValue("location", value);
                    fetchSuggestions(value);
                  }}
                  onSelect={(_value: string, option: { suggestion: PlaceSuggestion }) => {
                    handleSelect(option.suggestion);
                  }}
                  options={suggestions.map((item, index) => ({
                    key: index,
                    value: item.placePrediction.text.text,
                    label: item.placePrediction.text.text,
                    suggestion: item,
                  }))}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  save changes
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

export default EditHelpRequest;
