import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components//Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ICMS Terminal",
  description: "Tuition Center Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ICMS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, url, line, col, error) {
                var errBox = document.createElement('div');
                errBox.style = "position:fixed;top:0;left:0;z-index:999999;background:red;color:white;padding:20px;width:100%;font-size:16px;white-space:pre-wrap;box-sizing:border-box;word-break:break-all;max-height:50vh;overflow:auto;";
                errBox.innerText = "ERROR: " + msg + "\\nAt: " + url + ":" + line + ":" + col + "\\n\\n" + (error ? error.stack : '');
                document.body.appendChild(errBox);
              };
              window.addEventListener('unhandledrejection', function(event) {
                var errBox = document.createElement('div');
                errBox.style = "position:fixed;bottom:0;left:0;z-index:999999;background:darkorange;color:white;padding:20px;width:100%;font-size:16px;white-space:pre-wrap;box-sizing:border-box;word-break:break-all;max-height:50vh;overflow:auto;";
                errBox.innerText = "PROMISE REJECTION: " + (event.reason ? event.reason.toString() : 'Unknown');
                if (event.reason && event.reason.stack) {
                  errBox.innerText += "\\n\\n" + event.reason.stack;
                }
                document.body.appendChild(errBox);
              });
            `
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 flex flex-col md:flex-row min-h-screen custom-scrollbar">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
