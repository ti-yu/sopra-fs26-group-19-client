"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation"; // use NextJS router for navigation
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
// Optionally, you can import a CSS module or file for additional styling:
// import styles from "@/styles/page.module.css";

interface FormFieldProps {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  // useLocalStorage hook example use
  // The hook returns an object with the value and two functions
  // Simply choose what you need from the hook:
  const {
    // value: token, // is commented out because we do not need the token value
    set: setToken, // we need this method to set the value of the token to the one we receive from the POST request to the backend server API
    // clear: clearToken, // is commented out because we do not need to clear the token when logging in
  } = useLocalStorage<string>("token", ""); // note that the key we are selecting is "token" and the default value we are setting is an empty string
  // if you want to pick a different token, i.e "usertoken", the line above would look as follows: } = useLocalStorage<string>("usertoken", "");

  const handleLogin = async (values: FormFieldProps) => {
    try {
      // Call the API service and let it handle JSON serialization and error handling
      const response = await apiService.post<User>("/login", values);

      // Use the useLocalStorage hook that returned a setter function (setToken in line 41) to store the token if available
      if (response.token) {
        setToken(response.token);
      }

      // Navigate to the user profile screen using their ID
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
      <div style={{
        backgroundColor: "#e5e5e5",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px"
      }}>
        <div style={{
          backgroundColor: "white",
          width: "100%",
          maxWidth: "400px",
          height: "80vh",
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
          padding: "40px 20px 30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>

          {/* --- Header Section --- */}
          <div style={{ position: "relative", textAlign: "center", marginBottom: "40px" }}>
          <span
              onClick={() => router.push("/registration")}
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#d9737d",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 500
              }}
          >
            register
          </span>
            <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#000" }}>Login</h1>
          </div>

          {/* --- Form Section --- */}
          <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              layout="vertical"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column"
              }}
          >
            {/* Username Input */}
            <Form.Item
                name="username"
                rules={[{ required: true, message: "Please input your username!" }]}
                style={{ marginBottom: "20px" }}
            >
              <Input
                  placeholder="Username"
                  style={{
                    backgroundColor: "#f5f5f5",
                    color: "#000",
                    border: "none",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    fontSize: "16px"
                  }}
              />
            </Form.Item>

            {/* Password Input */}
            <Form.Item
                name="password"
                rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password
                  placeholder="Password"
                  style={{
                    backgroundColor: "#f5f5f5",
                    color: "#000",
                    border: "none",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    fontSize: "16px"
                  }}
                  // This swaps the default eye icon for the custom text from your mockup
                  iconRender={visible => (
                      <span style={{ color: "#d9737d", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                  {visible ? "Hide" : "Show"}
                </span>
                  )}
              />
            </Form.Item>

            {/* This empty div flex-grows to push the button to the bottom */}
            <div style={{ flex: 1 }}></div>

            {/* Login Button */}
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                  htmlType="submit"
                  block
                  style={{
                    backgroundColor: "#d9737d",
                    color: "white",
                    border: "none",
                    borderRadius: "30px", // Pill shape
                    height: "55px",
                    fontSize: "18px",
                    fontWeight: "bold"
                  }}
              >
                Login
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
  );
};

export default Login;
