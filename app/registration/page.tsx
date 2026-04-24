"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Radio, Input, DatePicker, Select, Switch, message } from "antd";
import dayjs from "dayjs";

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
            <Input placeholder="Enter address" />
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
  );
};

export default Register;