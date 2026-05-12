"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SNT from "@/components/StudentNameTransformer";

// --- Minimalist Professional Rank Engine ---
const RANKS = [
  { name: "Initiate", min: 0, max: 299, color: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", icon: "📚" },
  { name: "Scholar", min: 300, max: 899, color: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "🔬" },
  { name: "Achiever", min: 900, max: 1999, color: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "⭐" },
  { name: "Elite", min: 2000, max: 4999, color: "bg-navy-50", text: "text-navy-700", border: "border-navy-200", icon: "🏅" },
  { name: "Legend", min: 5000, max: 99999, color: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "🏆" }
];

const getRankDetails = (xp: number) => {
  const currentRank = RANKS.find(r => xp >= r.min && xp <= r.max) || RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(currentRank) + 1] || currentRank;
  
  let progress = 100;
  let xpNeeded = 0;
  if (currentRank !== nextRank) {
    const range = currentRank.max - currentRank.min;
    const xpIntoRank = xp - currentRank.min;
    progress = Math.min(100, Math.max(0, (xpIntoRank / range) * 100));
    xpNeeded = (currentRank.max + 1) - xp;
  }

  return { currentRank, nextRank, progress, xpNeeded };
};

export default function LeaderboardPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, grade_batch, total_xp")
      .eq("is_active", true)
      .order("total_xp", { ascending: false })
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching leaderboard:", error);
    } else {
      setStudents(data || []);
    }
    setIsLoading(false);
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.grade_batch && s.grade_batch.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-navy-900 tracking-tight flex items-center gap-3">
            <span className="text-amber-500">🏆</span> Leaderboard
          </h1>
          <p className="text-slate-500 font-medium mt-2">Track student progression and academic experience points.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search students or batch..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 p-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all shadow-sm bg-white"
          />
        </div>
      </header>

      {/* THE PODIUM (Top 3) */}
      {!isLoading && filteredStudents.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-3 gap-4 mb-8 items-end max-w-4xl mx-auto">
          {/* 2nd Place */}
          <div className="bg-white rounded-t-2xl border border-slate-200 shadow-sm p-4 text-center transform translate-y-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-3 shadow-sm border border-slate-200">🥈</div>
            <p className="font-bold text-navy-900 line-clamp-1">{SNT(filteredStudents[1].full_name)}</p>
            <p className="text-sm font-black text-slate-500 mt-1">{filteredStudents[1].total_xp || 0} XP</p>
            <div className="w-full h-32 bg-slate-100 rounded-t-lg mt-4 border-t border-slate-200"></div>
          </div>
          {/* 1st Place */}
          <div className="bg-white rounded-t-2xl border-t-4 border-amber-500 shadow-md p-6 text-center z-10 flex flex-col items-center relative">
            <div className="absolute -top-6 text-4xl">👑</div>
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl mb-3 shadow-sm border border-amber-200">🥇</div>
            <p className="font-black text-lg text-navy-900 line-clamp-1">{SNT(filteredStudents[0].full_name)}</p>
            <p className="text-lg font-black text-amber-600 mt-1">{filteredStudents[0].total_xp || 0} XP</p>
            <div className="w-full h-40 bg-amber-50 rounded-t-lg mt-4 border-t border-amber-100"></div>
          </div>
          {/* 3rd Place */}
          <div className="bg-white rounded-t-2xl border border-slate-200 shadow-sm p-4 text-center transform translate-y-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-2xl mb-3 shadow-sm border border-orange-200">🥉</div>
            <p className="font-bold text-navy-900 line-clamp-1">{SNT(filteredStudents[2].full_name)}</p>
            <p className="text-sm font-black text-slate-500 mt-1">{filteredStudents[2].total_xp || 0} XP</p>
            <div className="w-full h-24 bg-orange-50 rounded-t-lg mt-4 border-t border-orange-100"></div>
          </div>
        </div>
      )}

      {/* THE MAIN LEADERBOARD */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading Leaderboard...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold w-16 text-center">#</th>
                  <th className="p-4 font-bold">Student</th>
                  <th className="p-4 font-bold">Current Rank</th>
                  <th className="p-4 font-bold w-1/3 min-w-[200px]">Next Rank Progress</th>
                  <th className="p-4 font-bold text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const xp = student.total_xp || 0;
                  const { currentRank, nextRank, progress, xpNeeded } = getRankDetails(xp);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 text-center font-bold text-slate-400 group-hover:text-amber-500 transition-colors">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-navy-900 text-base">{SNT(student.full_name)}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{student.grade_batch || "No Batch"}</p>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${currentRank.color} ${currentRank.text} ${currentRank.border}`}>
                          <span className="text-sm">{currentRank.icon}</span>
                          <span className="text-[11px] font-black tracking-widest uppercase">{currentRank.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {currentRank === nextRank ? (
                          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded">Max Level Reached</span>
                        ) : (
                          <div className="w-full max-w-xs">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                              <span className="text-slate-400">{xpNeeded} XP to {nextRank.name}</span>
                              <span className="text-navy-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xl font-black text-navy-900 tracking-tight">
                          {xp.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
