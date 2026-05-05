"use client";

import { Sprout, Waves, Shield, Swords, Crown, Award } from "lucide-react";
import { calculateRank } from "@/lib/gamification"; 

const RankIcons: Record<string, any> = {
  "Sprout": Sprout,
  "Waves": Waves,
  "Shield": Shield,
  "Swords": Swords,
  "Crown": Crown,
  "Default": Award 
};

interface HeroStatsProps {
  totalXp: number;
  qrCode: string;
  cardVariant?: number;
}

export default function HeroStats({ totalXp, qrCode }: HeroStatsProps) {
  
  const rankData = calculateRank(totalXp);
  const DynamicIcon = RankIcons[rankData.icon] || RankIcons["Default"];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0B1120] rounded-[2rem] p-6 md:p-8 text-white shadow-2xl shadow-indigo-500/10 relative overflow-hidden border border-slate-800">
      
      {/* Deep Indigo Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Main Content Flex (Stacks on mobile, side-by-side on desktop) */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 mb-6">
        
        {/* Left Column: ID and XP */}
        <div className="flex flex-col justify-center">
          {/* ID Badge (Cleanly replacing the old "Player Status" tag) */}
          <div className="inline-flex items-center gap-2 mb-4 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg w-max backdrop-blur-sm">
            <span className="text-[11px] font-mono font-bold text-slate-300 tracking-[0.15em] uppercase">
              ID: {qrCode}
            </span>
          </div>
          
          {/* XP Readout */}
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tight drop-shadow-md">{totalXp}</span>
            <span className="text-2xl font-bold text-indigo-400">XP</span>
          </div>
        </div>

        {/* Right Column: The Large Rank Card */}
        <div className="w-full md:w-36 h-36 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-3xl flex flex-col items-center justify-center shrink-0 shadow-inner backdrop-blur-md transform transition-transform hover:scale-105 duration-300">
          
          {/* Dynamic Lucide Icon Container */}
          <div className="w-18 h-18 bg-indigo-500/20 rounded-2xl shadow-sm border border-indigo-500/30 flex items-center justify-center mb-3">
            <DynamicIcon className="w-8 h-8 text-indigo-400" />
          </div>
          
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none mb-1.5">
            Lvl {rankData.level}
          </p>
          <p className="text-xs font-bold text-slate-200 text-center px-2 leading-tight">
            {rankData.rankName}
          </p>
        </div>
      </div>

      {/* --- BOTTOM ROW: Progress Bar --- */}
      <div className="relative z-10 pt-5 border-t border-white/10">
        <div className="flex justify-between items-end mb-3 px-1">
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Rank Progress</span>
          <span className="text-[12px] font-bold text-indigo-400">
            {rankData.isMaxRank ? "Max Rank Achieved!" : `${rankData.xpToNext} XP to Level ${rankData.level + 1}`}
          </span>
        </div>
        
        {/* The Track */}
        <div className="w-full h-3.5 bg-slate-800 border border-slate-700 rounded-full overflow-hidden shadow-inner">
          {/* The Animated Fill */}
          <div 
            className="h-full bg-indigo-500 rounded-full relative transition-all duration-1000 ease-out"
            style={{ width: `${rankData.progressPercentage}%` }}
          >
            {/* Glossy Highlight */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-full"></div>
          </div>
        </div>
      </div>

    </div>
  );
}