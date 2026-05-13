"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateRank } from "@/lib/gamification";
import { ArrowLeft, Swords } from "lucide-react";

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

export default function LeaderboardPage() {
  const router = useRouter();
  
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [gradeBatch, setGradeBatch] = useState<string>("");
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/"); 
        return;
      }
      setActiveStudentId(studentId);

      try {
        const { data: me, error: meError } = await supabase
          .from("students")
          .select("grade_batch")
          .eq("id", studentId)
          .single();

        if (meError) throw meError;
        setGradeBatch(me.grade_batch);

        const { data: leaderboardData, error: leaderError } = await supabase
          .from("students")
          .select("id, full_name, total_xp, card_variant")
          .eq("grade_batch", me.grade_batch)
          .eq("is_active", true)
          .order("total_xp", { ascending: false })
          .limit(10);

        if (leaderError) throw leaderError;
        setLeaders(leaderboardData || []);

      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Rankings...</p>
      </div>
    );
  }

  // --- PODIUM LOGIC ---
  const topThree = leaders.slice(0, 3);
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], rank: 2 }); // Left
  if (topThree[0]) podiumOrder.push({ ...topThree[0], rank: 1 }); // Center
  if (topThree[2]) podiumOrder.push({ ...topThree[2], rank: 3 }); // Right
  
  const runnerUps = leaders.slice(3);

  // Helper for subtle podium themes
  const getPodiumStyles = (rank: number) => {
    switch(rank) {
      case 1: return {
        height: 'h-[100%]',
        theme: 'amber',
        border: 'border-amber-200',
        bg: 'bg-white',
        ring: 'ring-amber-200',
        shadow: 'shadow-sm',
        text: 'text-slate-800'
      };
      case 2: return {
        height: 'h-[80%]',
        theme: 'slate',
        border: 'border-slate-200',
        bg: 'bg-white',
        ring: 'ring-slate-200',
        shadow: 'shadow-sm',
        text: 'text-slate-800'
      };
      case 3: return {
        height: 'h-[70%]',
        theme: 'orange',
        border: 'border-orange-200',
        bg: 'bg-white',
        ring: 'ring-orange-200',
        shadow: 'shadow-sm',
        text: 'text-slate-800'
      };
      default: return { height: 'h-full', border: '', bg: '', ring: '', shadow: '', text: '' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-100 selection:text-slate-900 pb-24 relative overflow-hidden">
      
      {/* Removed dark ambience */}

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        
        {/* Header */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="text-center mb-16 animate-in slide-in-from-top-4 fade-in duration-700">
          <h1 className="text-5xl md:text-6xl font-black text-slate-800 tracking-tight mb-2">
            Rankings
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs">
            {gradeBatch} Division
          </p>
        </div>

        {leaders.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <p className="font-bold text-slate-500 uppercase tracking-widest">No challengers yet.</p>
          </div>
        ) : (
          <>
            {/* === THE REFINED SUBTLE PODIUM === */}
            <div className="flex items-end justify-center gap-3 md:gap-5 mb-16 mt-16 h-64 md:h-72">
              {podiumOrder.map((player) => {
                const isMe = player.id === activeStudentId;
                const pStyles = getPodiumStyles(player.rank);
                const playerRankInfo = calculateRank(player.total_xp || 0);

                return (
                  <div 
                    key={player.id} 
                    className={`relative w-28 md:w-36 flex flex-col items-center justify-end animate-in slide-in-from-bottom-10 fade-in duration-1000 ${pStyles.height}`}
                    style={{ animationDelay: `${player.rank * 150}ms` }}
                  >
                    {/* The Avatar Bubble (Perfectly spaced, no aggressive bounce clipping) */}
                    <div className="absolute -top-14 md:-top-16 z-20 flex flex-col items-center">
                      {player.rank === 1 && <span className="text-2xl drop-shadow-md mb-1 animate-pulse">👑</span>}
                      {player.rank === 2 && <span className="text-xl drop-shadow-md mb-1 opacity-80">🥈</span>}
                      {player.rank === 3 && <span className="text-xl drop-shadow-md mb-1 opacity-80">🥉</span>}
                      
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-black text-xl md:text-2xl relative ring-4 ${pStyles.ring} shadow-md`}>
                        {getInitials(player.full_name)}
                        {isMe && <div className="absolute -bottom-2 bg-amber-500 text-white text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ring-2 ring-white">You</div>}
                      </div>
                    </div>

                    {/* The Frosted Glass Pillar */}
                    <div className={`w-full h-full rounded-t-2xl border-t-2 border-l border-r flex flex-col items-center justify-start pt-14 md:pt-16 px-2 text-center transition-all duration-300 hover:bg-slate-50 ${pStyles.bg} ${pStyles.border} ${pStyles.shadow}`}>
                      <h3 className={`font-black text-sm md:text-base line-clamp-1 mb-0.5 ${pStyles.text}`}>
                        {player.full_name.split(' ')[0]}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500 mb-2 truncate w-full flex justify-center items-center gap-1">
                        {playerRankInfo.emoji} {playerRankInfo.rankName}
                      </p>
                      <span className="text-xl md:text-3xl font-black text-slate-800 leading-none">{player.total_xp}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* === THE CONTENDERS LIST === */}
            <div className="space-y-3 relative z-20">
              {runnerUps.map((player, index) => {
                const rank = index + 4;
                const isMe = player.id === activeStudentId;
                const playerRankInfo = calculateRank(player.total_xp || 0);

                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 animate-in slide-in-from-right-8 fade-in ${
                      isMe 
                        ? 'bg-amber-50 border-amber-200 shadow-sm' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                    }`}
                    style={{ animationDelay: `${(index + 3) * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center text-slate-500 font-black text-lg">
                        #{rank}
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ring-2 ${isMe ? 'bg-amber-500 text-white ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                        {getInitials(player.full_name)}
                      </div>
                      <div>
                        <h3 className={`font-black text-sm md:text-base flex items-center gap-2 ${isMe ? 'text-amber-700' : 'text-slate-800'}`}>
                          {player.full_name} 
                          {isMe && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">You</span>}
                        </h3>
                        {/* Now showing the actual rank emoji and name instead of just Card Level! */}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <span>{playerRankInfo.emoji}</span> {playerRankInfo.rankName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-xl font-black ${isMe ? 'text-amber-600' : 'text-slate-800'}`}>
                        {player.total_xp}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}