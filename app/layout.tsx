import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { App as AntdApp, ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student XX-XXX-XXX",
  description: "sopra-fs26-template-client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#d9737d",
              colorBgContainer: "#f5f5f5",
              colorText: "#000000",
              colorBorder: "#e0e0e0",
              colorTextPlaceholder: "#aaaaaa",
              borderRadius: 10,
              fontSize: 16,
            },
            components: {
              Button: {
                colorPrimary: "#d9737d",
                primaryColor: "#ffffff",
                borderRadius: 30,
                controlHeight: 55,
                fontSize: 18,
              },
              Input: {
                colorBorder: "#e0e0e0",
                colorTextPlaceholder: "#aaaaaa",
              },
              Select: {
                colorBgContainer: "#f5f5f5",
                colorText: "#000000",
                colorBgElevated: "#ffffff",
                optionSelectedBg: "#fdf0f1",
                optionActiveBg: "#fdf0f1",
              },
              DatePicker: {
                colorBgContainer: "#f5f5f5",
                colorText: "#000000",
              },
              Form: {
                labelColor: "#000000",
              },
              Card: {},
            },
          }}
        >
          <AntdRegistry>
            <AntdApp>{children}</AntdApp>
          </AntdRegistry>
        </ConfigProvider>
      </body>
    </html>
  );
}