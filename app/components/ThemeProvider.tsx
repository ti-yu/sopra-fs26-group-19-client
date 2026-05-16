"use client";

import { ConfigProvider, App as AntdApp } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import useLocalStorage from "@/hooks/useLocalStorage";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { value: isVolunteer } = useLocalStorage<boolean>("isVolunteer", false);
  const primaryColor = isVolunteer ? "#53beb3" : "#d9737d";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorPrimaryBorder: "#ffcc00",
          colorBgContainer: "#f5f5f5",
          colorText: "#000000",
          colorBorder: "#e0e0e0",
          colorTextPlaceholder: "#aaaaaa",
          borderRadius: 10,
          fontSize: 16,
        },
        components: {
          Button: {
            colorPrimary: primaryColor,
            colorPrimaryBorder: "#ffcc00",
            primaryColor: "#ffffff",
            borderRadius: 30,
            controlHeight: 55,
            fontSize: 18,
          },
          Input: {
            colorBorder: "#e0e0e0",
            colorTextPlaceholder: "#aaaaaa",
            colorPrimaryBorder: "#ffcc00",
          },
          Select: {
            colorBgContainer: "#f5f5f5",
            colorPrimaryBorder: "#ffcc00",
            colorText: "#000000",
            colorBgElevated: "#ffffff",
            optionSelectedBg: "#fdf0f1",
            optionActiveBg: "#fdf0f1",
          },
          DatePicker: {
            colorBgContainer: "#f5f5f5",
            colorText: "#000000",
            colorPrimaryBorder: "#ffcc00",
          },
          Form: {
            labelColor: "#000000",
            colorPrimaryBorder: "#ffcc00",
          },
          Card: {},
        },
      }}
    >
      <AntdRegistry>
        <AntdApp>{children}</AntdApp>
      </AntdRegistry>
    </ConfigProvider>
  );
}