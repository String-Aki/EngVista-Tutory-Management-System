import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function ExamVaultButton() {
  return (
    <Link 
      href="/dashboard/exams"
      className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group relative overflow-hidden flex flex-col justify-between"
    >
      {/* Background Glow on Hover */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors"></div>
      
      <div>
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-1 group-hover:text-cyan-700 transition-colors">
          <GraduationCap className="w-6 h-6 text-cyan-500" /> Exam Results
        </h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Track your grades, test scores, and performance history.</p>
      </div>

      <div className="flex items-center text-xs font-bold text-cyan-600 uppercase tracking-widest gap-1 group-hover:gap-2 transition-all">
        View Grades <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}