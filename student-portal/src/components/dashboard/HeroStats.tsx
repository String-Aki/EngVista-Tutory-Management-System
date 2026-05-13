"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

interface HeroStatsProps {
  totalXp: number;
  qrCode: string;
  cardVariant?: number;
}

export default function HeroStats({ totalXp, qrCode }: HeroStatsProps) {
  return (
    <div className="bg-gradient-to-br from-[#0B1120] to-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
      
      {/* Subtle Gold/Amber Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Top right Settings Icon */}
      <Link 
        href="/dashboard/settings"
        className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 backdrop-blur-sm z-20"
      >
        <Settings className="w-5 h-5 text-slate-300 hover:text-white" />
      </Link>

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
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight text-white drop-shadow-md">{totalXp}</span>
            <span className="text-2xl font-bold text-amber-500 uppercase">XP Earned</span>
          </div>
        </div>

      </div>
    </div>
  );
}