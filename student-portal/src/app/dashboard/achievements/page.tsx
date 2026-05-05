"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RANKS, ACHIEVEMENTS } from "@/lib/gamification";
import { ArrowLeft, Trophy, Shield, Medal, Lock } from "lucide-react";

export default function AchievementsPage() {
  const router = useRouter();

  const [studentXp, setStudentXp] = useState(0);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrophyData = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/");
        return;
      }

      try {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("total_xp")
          .eq("id", studentId)
          .single();

        if (studentError) throw studentError;
        setStudentXp(studentData.total_xp);

        const { data: badgeData, error: badgeError } = await supabase
          .from("student_achievements")
          .select("achievement_id")
          .eq("student_id", studentId);

        if (badgeError) throw badgeError;

        setUnlockedBadgeIds(
          badgeData ? badgeData.map((row) => row.achievement_id) : [],
        );
      } catch (error) {
        console.error("Error fetching trophies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrophyData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
        <p className="text-rose-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Polishing Trophies...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-rose-500 selection:text-white pb-24 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-rose-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 flex items-center gap-4">
            <Trophy className="w-10 h-10 text-rose-500" /> Trophy Room
          </h1>
          <p className="text-rose-300 font-bold uppercase tracking-widest text-xs">
            Stickers & Progression
          </p>
        </div>

        {/* --- SECTION 1: XP RANKS --- */}
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-rose-500" /> Progression Ranks
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {RANKS.map((rank, index) => {
            const isUnlocked = studentXp >= rank.min;

            return (
              <div
                key={rank.id}
                className={`relative p-5 rounded-3xl border transition-all duration-500 animate-in slide-in-from-bottom-8 fade-in ${isUnlocked ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-white/5 border-white/5 opacity-50 grayscale"}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="text-center mb-4">
                  <div
                    className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-4xl mb-2 ${isUnlocked ? "bg-white/20 shadow-inner" : "bg-slate-800"}`}
                  >
                    {rank.emoji}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isUnlocked ? "text-white border-white/30 bg-white/10" : "border-slate-600 text-slate-500"}`}
                  >
                    {isUnlocked ? "Unlocked" : `Requires ${rank.min} XP`}
                  </span>
                </div>
                <h3
                  className={`font-black text-center leading-tight mb-2 ${isUnlocked ? "text-white" : "text-slate-500"}`}
                >
                  {rank.name}
                </h3>
                <p className="text-xs font-medium text-center text-slate-400 line-clamp-2">
                  {rank.desc}
                </p>
                {!isUnlocked && (
                  <div className="absolute top-4 right-4 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- SECTION 2: SPECIAL BADGES --- */}
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <Medal className="w-6 h-6 text-rose-500" /> Special Badges
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((ach, index) => {
            const isUnlocked = unlockedBadgeIds.includes(ach.id);

            return (
              <div
                key={ach.id}
                className={`relative p-5 rounded-3xl border transition-all duration-500 animate-in slide-in-from-bottom-8 fade-in ${isUnlocked ? "bg-white/10 border-rose-500/50 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/5 opacity-50 grayscale"}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="text-center mb-4">
                  <div
                    className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-4xl mb-2 ${isUnlocked ? "bg-rose-500/20 shadow-inner" : "bg-slate-800"}`}
                  >
                    {ach.icon}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isUnlocked ? "text-rose-300 border-rose-500/30 bg-rose-500/10" : "border-slate-600 text-slate-500"}`}
                  >
                    {isUnlocked ? "Earned" : "Secret"}
                  </span>
                </div>
                <h3
                  className={`font-black text-center leading-tight mb-2 ${isUnlocked ? "text-white" : "text-slate-500"}`}
                >
                  {ach.name}
                </h3>
                <p className="text-xs font-medium text-center text-slate-400 line-clamp-2">
                  {ach.desc}
                </p>
                {!isUnlocked && (
                  <div className="absolute top-4 right-4 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}