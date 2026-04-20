"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input, message } from "antd";

interface FormFieldProps {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { set: setUserId } = useLocalStorage<string>("userId", "");


  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleLogin = async (values: FormFieldProps) => {
    try {
      const response = await apiService.post<User>("/login", values);
      if (response.token) {
        setToken(response.token);
        setUserId(response.id);
        // Store isVolunteer so other pages (navbar, etc.) can check role
        // without needing an extra API call to fetch the user profile.
        sessionStorage.setItem("isVolunteer", String(response.isVolunteer));
      }
      router.push(`/profile/${response.id}`);
    } catch (error: any) {
      if (error.response?.status === 401 || error.status === 401) {
        message.error("Incorrect password.");
      }
      else if (error.response?.status === 404 || error.status === 404) {
        message.error("User not found. Please create an account.");
      }
      else if (error instanceof Error) {
        const backendMessage = error.message.toLowerCase();

        if (backendMessage.includes("password") || backendMessage.includes("credentials")) {
          message.error("Incorrect password.");
        } else if (backendMessage.includes("not found") || backendMessage.includes("user")) {
          message.error("User not found. Please create an account.");
        } else {
          message.error("An unknown error occurred during login.");
        }
      }
      else {
        message.error("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="auth-card">

        {/* --- Header Section --- */}
        <div className="auth-card-header">
          <span className="header-link" onClick={() => router.push("/registration")}>
            register
          </span>
          <h1>Login</h1>
        </div>

        {/* --- Form Section --- */}
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          className="auth-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              placeholder="Password"
              iconRender={visible => (
                <span className="password-toggle">
                  {visible ? "Hide" : "Show"}
                </span>
              )}
            />
          </Form.Item>

          <div className="auth-form-spacer" />

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block>
              Login
            </Button>
          </Form.Item>
        </Form>

      </div>
    </div>
  );
};

export default Login;