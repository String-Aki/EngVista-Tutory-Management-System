import Link from "next/link";
import { Library, ArrowRight } from "lucide-react";

export default function VaultButton() {
  return (
    <Link 
      href="/dashboard/vault"
      className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 transition-all group relative overflow-hidden flex flex-col justify-between"
    >
      {/* Background Glow on Hover */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
      
      <div>
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-1 group-hover:text-purple-700 transition-colors">
          <Library className="w-6 h-6 text-purple-500" /> Library
        </h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Access your class notes, slides, and reference materials.</p>
      </div>

      <div className="flex items-center text-xs font-bold text-purple-600 uppercase tracking-widest gap-1 group-hover:gap-2 transition-all">
        Open Library <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}