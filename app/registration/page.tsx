"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input, DatePicker, Select, Switch } from "antd";
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

  const handleRegister = async (values: RegisterFormValues) => {
    try {
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
      };

      const created = await apiService.post<User>("/profile", payload);

      const loginResponse = await apiService.post<User>("/login", {
        username: values.username,
        password: values.password,
      });

      if (!loginResponse.token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      setToken(loginResponse.token);
      router.push(`/profile/${created.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during registration:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during registration.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="auth-card" style={{ height: "auto", minHeight: "500px" }}>

        {/* --- Header Section --- */}
        <div className="auth-card-header">
          <span className="header-link" onClick={() => router.push("/login")}>
            login
          </span>
          <h1>Registration</h1>
        </div>

        {/* --- Form Section --- */}
        <Form
          form={form}
          name="register"
          size="large"
          variant="outlined"
          onFinish={handleRegister}
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
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
                { value: "prefer_not_to_say", label: "Prefer not to say" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number">
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item name="dateOfBirth" label="Date of Birth">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="isVolunteer"
            label="Are you a volunteer?"
            valuePropName="checked"
          >
            <Switch />
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