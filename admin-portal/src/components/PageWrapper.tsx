"use client";

import { usePathname } from "next/navigation";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/" || pathname === "/check-in";

  return (
    <div className={`flex flex-col min-h-screen ${isAuthPage ? "" : "pb-20 md:pb-0 md:ml-64 lg:ml-72"}`}>
      {children}
    </div>
  );
}
