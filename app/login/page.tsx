"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";

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
        localStorage.setItem("isVolunteer", String(response.isVolunteer));
      }
      router.push(`/profile/${response.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during login.");
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