"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

export default function ClassCycle({ studentId, cycleClasses }: { studentId: string, cycleClasses: number }) {
  return (
    <Link 
      href="/dashboard/attendance"
      className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group block"
    >
      <div>
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-1 group-hover:text-amber-600 transition-colors">
          <CalendarDays className="w-5 h-5 text-amber-500" /> Class Cycle
        </h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Your progress towards the next fee renewal.</p>
      </div>
      
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Attended</span>
          <span className="text-2xl font-black text-slate-800">{cycleClasses} <span className="text-lg text-slate-400">/ 8</span></span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out relative" 
            style={{ width: `${Math.min((cycleClasses / 8) * 100, 100)}%` }}
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>
          </div>
        </div>
      </div>
    </Link>
  );
}