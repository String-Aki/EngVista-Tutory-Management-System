import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";

export default function LeaderboardButton() {
  return (
    <div className="md:col-span-2 bg-gradient-to-r from-[#0B1120] to-slate-900 rounded-[2rem] p-6 md:p-8 shadow-xl relative overflow-hidden group border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none transition-transform group-hover:scale-150 duration-700"></div>
      <div className="relative z-10 text-center md:text-left">
        <h2 className="font-black text-white text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3 mb-1">
          <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-500" /> Rankings
        </h2>
        <p className="text-sm font-medium text-slate-400">View your academic standing among your batchmates.</p>
      </div>
      <Link 
        href="/dashboard/leaderboard"
        className="relative z-10 w-full md:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 group-hover:border-amber-500/50 duration-300"
      >
        View Rankings <ArrowRight className="w-4 h-4 text-amber-500" />
      </Link>
    </div>
  );
}