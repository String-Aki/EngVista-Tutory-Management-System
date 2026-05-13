"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Trophy, CreditCard } from "lucide-react";
import clsx from "clsx";

export default function StudentBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Schedule", href: "/dashboard/schedule", icon: CalendarDays },
    { name: "Rankings", href: "/dashboard/leaderboard", icon: Trophy },
    { name: "Ledger", href: "/dashboard/ledger", icon: CreditCard },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center px-2 pt-3 pb-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-16 gap-1 transition-colors duration-200",
                isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div
                className={clsx(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-amber-100" : "bg-transparent"
                )}
              >
                <Icon
                  className={clsx(
                    "w-5 h-5",
                    isActive ? "text-amber-600" : "currentColor"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={clsx(
                  "text-[10px] font-bold tracking-wide",
                  isActive ? "text-slate-900" : "text-slate-400"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
