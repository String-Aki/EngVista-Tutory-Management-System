"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function TopNav({ studentName }: { studentName: string }) {
  const router = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem("icms_active_student");
    router.push("/");
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
      <div>
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Welcome back</p>
        <h1 className="text-xl font-black text-slate-800 line-clamp-1">{studentName}</h1>
      </div>
      <button 
        onClick={handleSignOut}
        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-2 active:scale-95"
      >
        <Lock className="w-4 h-4" /> Lock
      </button>
    </header>
  );
}