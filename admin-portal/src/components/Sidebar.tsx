"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  GraduationCap,
  CheckSquare,
  CreditCard,
  LogOut,
  Trophy,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (pathname === "/" || pathname === "/check-in") {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Enroll", href: "/enroll", icon: UserPlus },
    { name: "Schedule", href: "/schedule", icon: Calendar },
    { name: "Students Hub", href: "/students", icon: GraduationCap },
    { name: "Attendance", href: "/attendance", icon: CheckSquare },
    { name: "Ledger", href: "/dashboard/ledger", icon: CreditCard },
    { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  ];

  if (!isMounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full md:top-0 md:h-screen md:w-64 lg:w-72 bg-white border-t md:border-t-0 md:border-r border-slate-200 z-50 flex md:flex-col print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none">
      
      {/* Header - Desktop Only */}
      <div className="hidden md:flex p-6 md:p-8 items-center gap-4 border-b border-slate-100 shrink-0">
        <div className="relative w-12 h-12 rounded-2xl border-2 border-navy-600 shadow-sm shrink-0 overflow-hidden bg-navy-50">
          <Image
            src="/icon.png"
            alt="App Logo"
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight leading-none line-clamp-2">
            ENGVISTA
          </h1>
          <p className="text-gold-600 font-bold text-[10px] tracking-[0.1em] uppercase mt-1">
            Admin Portal
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 w-full overflow-x-auto md:overflow-y-auto scrollbar-hide md:p-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 hidden md:block px-4 pt-4">
          Management
        </div>

        <ul className="flex flex-row md:flex-col h-16 md:h-auto items-center md:items-stretch gap-1 md:gap-2 px-2 md:px-0">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (pathname.startsWith(link.href) && link.href !== "/dashboard");

            const Icon = link.icon;

            return (
              <li key={link.name} className="flex-1 md:flex-none h-full md:h-auto min-w-[64px]">
                <Link
                  href={link.href}
                  className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 h-full md:px-4 md:py-3.5 rounded-xl md:rounded-2xl transition-all group ${
                    isActive
                      ? "text-navy-900 md:bg-navy-50 md:shadow-sm"
                      : "text-slate-400 hover:text-navy-600 md:hover:bg-slate-50"
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 md:w-6 md:h-6 transition-all ${
                      isActive ? "text-gold-500 scale-110 md:scale-100" : "group-hover:scale-110"
                    }`}
                  />
                  <span 
                    className={`text-[10px] md:text-sm font-semibold transition-colors ${
                      isActive ? "text-navy-900" : "text-slate-500 group-hover:text-navy-700"
                    }`}
                  >
                    {link.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer / Sign Out */}
      <div className="hidden md:block p-6 mt-auto border-t border-slate-100 bg-white shrink-0">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 hover:bg-red-50 hover:border-red-100 transition-all group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-200 shadow-sm group-hover:bg-red-100 group-hover:text-red-600 group-hover:border-red-200 flex items-center justify-center shrink-0 transition-colors">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-navy-900 group-hover:text-red-700 truncate transition-colors">
              Sign Out
            </p>
            <p className="text-[10px] font-semibold text-slate-500 group-hover:text-red-500 uppercase tracking-widest transition-colors mt-0.5">
              Lock Session
            </p>
          </div>
        </button>
      </div>

      {/* Mobile Sign Out Button */}
      <button 
        onClick={handleSignOut}
        className="md:hidden flex flex-col items-center justify-center gap-1 min-w-[64px] h-16 text-slate-400 hover:text-red-500 transition-colors px-2"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-[10px] font-semibold">Sign Out</span>
      </button>

    </nav>
  );
}
