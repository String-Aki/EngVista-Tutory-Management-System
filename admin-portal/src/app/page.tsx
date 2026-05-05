"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 

export default function AdminAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setIsAuthenticating(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsAuthenticating(false);
      } else if (data.session) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred during login.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row w-full font-sans">
      
      {/* LEFT SIDE: ACADEMY TERMINAL INFO & SCANNER QUICK-LAUNCH */}
      <div className="w-full md:w-5/12 lg:w-1/2 bg-[#0a0f1c] text-white flex flex-col justify-between p-8 md:p-12 lg:p-16 relative overflow-hidden shrink-0">
        <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="w-24 h-24 lg:w-28 lg:h-28 bg-white rounded-3xl shadow-xl overflow-hidden mb-8 relative p-1.5 flex items-center justify-center">
             <div className="relative w-full h-full rounded-2xl overflow-hidden">
               <Image src="/icon.png" alt="ICMS Logo" fill sizes="112px" className="object-cover" />
             </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 leading-tight">
            ICMS Academy <br />
            <span className="text-indigo-500">Terminal</span>
          </h1>
          
          <p className="text-slate-300 font-medium text-base lg:text-lg leading-relaxed max-w-sm">
            Secure management system for administrators, and quick-access scanning for students.
          </p>
        </div>

        <div className="relative z-10 mt-12 bg-[#141b2e] border border-slate-700/50 p-6 md:p-8 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-inner border border-slate-600/50">
            📷
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">Automated Attendance</h2>
          <p className="text-sm font-medium text-slate-400 mb-6 leading-relaxed">
            Launch the QR scanner. This mode does not require administrator authentication.
          </p>
          <Link 
            href="/check-in"
            className="flex items-center justify-center w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
          >
            Launch Attendance Scanner →
          </Link>
        </div>
      </div>

      {/* RIGHT SIDE: ADMIN LOGIN */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-white relative animate-in fade-in slide-in-from-right-8 duration-700">
        <div className="w-full max-w-md mx-auto flex flex-col items-center pb-8 border-b-0 border-slate-100 mb-8 mt-4">
          
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-2xl shadow-sm mb-6">
            🔒
          </div>
          
          <div className="mb-10 text-center">
            <h2 className="text-2xl lg:text-3xl font-black text-[#0f172a] mb-2 tracking-tight">Admin Portal</h2>
            <p className="text-slate-500 font-medium text-sm">Please authenticate to access the dashboard.</p>
          </div>
          
          <form onSubmit={handleAdminLogin} className="space-y-6 w-full max-w-[340px]">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.10em] mb-2 ml-1">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  suppressHydrationWarning
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-2xl px-5 py-3.5 text-slate-800 font-bold outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="admin@icms.edu"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                    <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.10em] mb-2 ml-1">Password</label>
              <input 
                type="password" 
                required
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-2xl px-5 py-3.5 text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300 shadow-sm font-sans text-xl tracking-[0.2em]"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-100 animate-in fade-in text-center">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAuthenticating}
              className="w-full py-4 mt-2 text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-[#0a0f1c] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                "Authorize Session"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}