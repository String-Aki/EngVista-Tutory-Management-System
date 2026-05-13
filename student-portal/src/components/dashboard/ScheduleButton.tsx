import Link from "next/link";
import { CalendarDays, ArrowRight, Clock } from "lucide-react";

export default function ScheduleButton() {
  return (
    <Link 
      href="/dashboard/schedule"
      className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
    >
      <div>
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-1 group-hover:text-slate-900 transition-colors">
          <CalendarDays className="w-6 h-6 text-slate-400 group-hover:text-amber-500 transition-colors" /> Upcoming Class
        </h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Check your timeline for upcoming classes and tests.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest gap-1 group-hover:text-slate-700 transition-all">
          <Clock className="w-4 h-4" /> View Schedule
        </div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
