"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Form, Input, DatePicker, Select, TimePicker, App } from "antd";
import dayjs from "dayjs";
import Navbar from "@/components/navbar";
import Script from "next/script";
import { useState } from "react";
import AuthWrapper from "@/components/AuthWrapper";

/**
 * Formats a duration value (in hours) into a compact "Xh Ym" form.
 */
const formatDuration = (value: number): string => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes} min`;
};

// Discrete duration options offered in the dropdown. We need a defined end
// time for each help request, so unbounded "<30min" / ">8h" buckets are gone.
const DURATION_OPTIONS: number[] = [
  1 / 60,  // 1 min
  5 / 60,
  10 / 60,
  15 / 60,
  30 / 60,
  45 / 60,
  1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8,
];

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
  const { message } = App.useApp();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

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
    form.setFieldValue("location", place.formattedAddress);
    setSuggestions([]);
  };

  // Tracks whether the form has any user-entered data. When false, the
  // "Clear form" button is greyed out, since clicking it on an empty form
  // would do nothing useful.
  const [hasFormData, setHasFormData] = useState(false);

  const handleClearForm = () => {
    form.resetFields();
    setQuery("");
    setSelectedPlace(null);
    setSuggestions([]);
    setHasFormData(false);
  };

  const handleValuesChange = (_changed: unknown, allValues: HelpRequestFormValues) => {
    const anyFilled = Object.values(allValues).some(v => v !== undefined && v !== null && v !== "");
    setHasFormData(anyFilled || !!selectedPlace || !!query);
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
      router.refresh();
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
            {/* "Cancel" used to navigate away, which made it too easy to lose typed data.
                Now it clears the form (only if there is something to clear). */}
            <button
              type="button"
              className="header-link"
              onClick={handleClearForm}
              disabled={!hasFormData}
              aria-disabled={!hasFormData}
              style={{
                color: hasFormData ? undefined : "#bbb",
                cursor: hasFormData ? "pointer" : "not-allowed",
              }}
            >
              <strong> Cancel </strong>
            </button>
            <h1>Get Help!</h1>
          </div>

          <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
            Fields marked with <span style={{ color: "#e53935" }}>*</span> are required.
          </p>

          <Form
            form={form}
            name="create-help-request"
            size="large"
            variant="outlined"
            onFinish={handleSubmit}
            onFinishFailed={handleFailedSubmit}
            onValuesChange={handleValuesChange}
            scrollToFirstError
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
              label="What do you need help with?"
              rules={[{ required: true, message: "Please describe what you need help with!" }]}
            >
              <Input.TextArea
                placeholder='E.g. "Help me carry groceries up my 3rd-floor apartment."'
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
                placeholder="Select or enter date (DD.MM.YYYY)"
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
                  placeholder="Select or enter time (HH:mm)"
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
              label="Duration"
              rules={[{ required: true, message: "Please select a duration!" }]}
            >
              <Select placeholder="Select duration">
                {DURATION_OPTIONS.map(value => (
                  <Select.Option key={value} value={String(value)}>
                    {formatDuration(value)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Location: same Input + suggestion-overlay pattern as the
                registration page. User must pick a Google Places suggestion
                so the backend gets a real lat/lng. */}
            <Form.Item label="Location" required>
              <div style={{ position: "relative" }}>
                <Input
                  value={query}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuery(value);
                    setSelectedPlace(null);
                    fetchSuggestions(value);
                    setHasFormData(true);
                  }}
                  placeholder="Enter address"
                  aria-label="Address"
                />
                {suggestions.length > 0 && (
                  <div
                    role="listbox"
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
                Post Request
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