"use client";

import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface HeroStatsProps {
  totalXp: number;
  qrCode: string;
  cardVariant?: number;
}

export default function HeroStats({ totalXp, qrCode }: HeroStatsProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="bg-gradient-to-br from-[#0B1120] to-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
      
      {/* Subtle Gold/Amber Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Top right Actions */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        <Link 
          href="/dashboard/settings"
          className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 backdrop-blur-sm"
        >
          <Settings className="w-5 h-5 text-slate-300 hover:text-white" />
        </Link>
        <button
          onClick={handleSignOut}
          className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 rounded-full transition-colors border border-slate-700 hover:border-red-500/30 backdrop-blur-sm group cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-300 group-hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* Main Content Flex */}
      <div className="relative z-10 flex flex-col justify-between gap-6">
        
        {/* Left Column: ID and XP */}
        <div className="flex flex-col justify-center pt-2">
          {/* ID Badge */}
          <div className="inline-flex items-center gap-2 mb-4 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg w-max backdrop-blur-sm">
            <span className="text-[11px] font-mono font-bold text-amber-500 tracking-[0.15em] uppercase">
              ID: {qrCode}
            </span>
          </div>
          
          {/* XP Readout */}
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black tracking-tight text-white drop-shadow-md">{totalXp}</span>
            <span className="text-2xl font-bold text-amber-500 uppercase">Points Earned</span>
          </div>
        </div>

      </div>
    </div>
  );
}