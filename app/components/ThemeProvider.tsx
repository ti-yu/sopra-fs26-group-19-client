"use client";
"use client";

import { ConfigProvider, App as AntdApp } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { createContext, useContext, useState, useCallback } from "react";

// Shared role context, consumed by useRole() across pages.
interface RoleContextType {
  isVolunteer: boolean;
  setIsVolunteer: (val: boolean) => void;
}

export const RoleContext = createContext<RoleContextType>({
  isVolunteer: false,
  setIsVolunteer: () => {},
});

export const useRole = () => useContext(RoleContext);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isVolunteer, setIsVolunteerState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = sessionStorage.getItem("isVolunteer");
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });

  const setIsVolunteer = useCallback((val: boolean) => {
    setIsVolunteerState(val);
    sessionStorage.setItem("isVolunteer", JSON.stringify(val));
  }, []);

  const primaryColor = isVolunteer ? "#53beb3" : "#d9737d";

  return (
    <RoleContext.Provider value={{ isVolunteer, setIsVolunteer }}>
        <ConfigProvider
        theme={{
            token: {
            colorPrimary: primaryColor,
            colorPrimaryBorder: "#ffcc00",
            colorBgContainer: "#f5f5f5",
            colorText: "#000000",
            colorBorder: "#e0e0e0",
            colorTextPlaceholder: "#767676",
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
                colorTextPlaceholder: "#767676",
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
    </RoleContext.Provider>
  );
}