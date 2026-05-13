"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const isAuthPage = pathname === "/" || pathname === "/check-in";

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthPage) {
        setIsAuthorized(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      } else {
        setIsAuthorized(true);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session && !isAuthPage) {
          router.push("/");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, isAuthPage, router]);

  if (!isAuthPage && !isAuthorized) {
    return null;
  }

  return (
    <div className={isAuthPage ? "w-full" : "flex flex-col min-h-screen pb-20 md:pb-0 md:ml-64 lg:ml-72"}>
      {children}
    </div>
  );
}
