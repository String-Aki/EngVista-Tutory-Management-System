import Link from "next/link";
import { Settings, ArrowRight } from "lucide-react";

export default function SettingsButton() {
  return (
    <Link 
      href="/dashboard/settings"
      className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:border-slate-400 hover:shadow-lg hover:shadow-slate-500/10 transition-all group relative overflow-hidden flex flex-col justify-between"
    >
      {/* Background Glow on Hover */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-500/10 rounded-full blur-2xl group-hover:bg-slate-500/20 transition-colors"></div>
      
      <div>
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-1 group-hover:text-slate-700 transition-colors">
          <Settings className="w-6 h-6 text-slate-500" /> Settings
        </h2>
        <p className="text-sm font-medium text-slate-500 mb-6">Manage your account, update your PIN, and more.</p>
      </div>

      <div className="flex items-center text-xs font-bold text-slate-600 uppercase tracking-widest gap-1 group-hover:gap-2 transition-all">
        Open Menu <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
