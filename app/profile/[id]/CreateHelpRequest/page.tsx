"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Button, Form, Input, DatePicker } from "antd";
import dayjs from "dayjs";
import Navbar from "@/components/navbar"

type HelpRequestFormValues = {
  description: string;
  date: dayjs.Dayjs;
  timeframe: string;
  location: string;
};

const CreateHelpRequest: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);

  const handleSubmit = async (values: HelpRequestFormValues) => {
    try {
      const payload = {
        recipientId: userId,
        description: values.description,
        date: values.date ? values.date.format("YYYY-MM-DD") : null,
        timeframe: values.timeframe,
        location: values.location,
      };

      await apiService.post("/help-requests", payload);
      router.push(`/profile/${userId}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong:\n${error.message}`);
      } else {
        console.error("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="auth-card" style={{ height: "auto", minHeight: "500px", paddingBottom: "80px" }}>

        {/* --- Header Section --- */}
        <div className="auth-card-header">
          <span className="header-link" onClick={() => router.back()}>
            Cancel
          </span>
          <h1>Get Help!</h1>
        </div>

        {/* --- Form Section --- */}
        <Form
          form={form}
          name="create-help-request"
          size="large"
          variant="outlined"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="description"
            label="Title"
            rules={[{ required: true, message: "Please enter a description!" }]}
          >
            <Input.TextArea
              placeholder="short description and requirements"
              maxLength={500}
              showCount
              rows={4}
            />
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
            name="timeframe"
            label="Duration (hours)"
            rules={[{ required: true, message: "Please enter the duration!" }]}
          >
            <Input placeholder="Duration (hours)" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
            rules={[{ required: true, message: "Please enter a location!" }]}
          >
            <Input placeholder="Enter location" />
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
  );
};

export default CreateHelpRequest;