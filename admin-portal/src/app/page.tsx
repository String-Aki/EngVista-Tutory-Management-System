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
    // Explicitly sign out so the user is forced to enter credentials every time they visit the login page
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

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
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 sm:pt-20 p-4 sm:p-8 font-sans relative bg-slate-950 [color-scheme:light]">
      {/* Rich Mesh Gradient Background — pointer-events-none prevents touch-event stealing in PWA mode */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600 rounded-full mix-blend-screen filter blur-[150px] animate-pulse pointer-events-none"></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50rem] h-[50rem] bg-amber-500 rounded-full mix-blend-screen filter blur-[150px] animate-pulse pointer-events-none"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-[40%] left-[40%] w-[30rem] h-[30rem] bg-emerald-600 rounded-full mix-blend-screen filter blur-[120px] animate-pulse pointer-events-none"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10 relative z-20 animate-in fade-in slide-in-from-bottom-8 duration-700 border border-white/20 border-t-[6px] border-t-amber-500">
        {/* Header / Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-white border border-amber-100 rounded-2xl flex items-center justify-center p-3 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] relative overflow-hidden transform -translate-y-4">
            <div className="relative w-full h-full rounded-xl overflow-hidden">
              <Image
                src="/icon.png"
                alt="ENGVISTA Logo"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        <div className="text-center mb-8 -mt-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-slate-900">
            Welcome Back
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Sign in to your ENGVISTA workspace
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">
              Email Address
            </label>
            <div className="relative group">
              <input
                id="admin-email-input"
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}

                className="w-full appearance-none bg-slate-50/50 border border-slate-200 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 rounded-2xl px-5 py-4 text-slate-800 font-bold !text-[16px] outline-none transition-all placeholder:text-slate-400 shadow-sm touch-action-manipulation select-text cursor-text relative z-50"
                placeholder="Admin@evms.eng"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                  <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">
              Password
            </label>
            <input
              id="admin-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full appearance-none bg-slate-50/50 border border-slate-200 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 rounded-2xl px-5 py-4 text-slate-800 font-bold !text-[16px] outline-none transition-all placeholder:text-slate-300 shadow-sm font-sans tracking-[0.2em] touch-action-manipulation select-text cursor-text relative z-50"
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
            className="w-full appearance-none py-4 mt-4 bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 hover:bg-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black rounded-xl transition-all shadow-[0_8px_30px_rgb(245,158,11,0.3)] hover:shadow-[0_8px_30px_rgb(245,158,11,0.5)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isAuthenticating ? (
              <>
                <div className="w-5 h-5 border-2 border-amber-200 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </>
            ) : (
              "Sign In to Dashboard"
            )}
          </button>
        </form>

        {/* Scanner Quick-Launch */}
        <div className="mt-8 pt-6 border-t border-slate-100/80 text-center">
          <Link
            href="/check-in"
            className="group inline-flex items-center justify-center gap-3 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors bg-slate-50 hover:bg-amber-50/50 px-6 py-3 rounded-xl border border-slate-100 hover:border-amber-200 w-full"
          >
            <span className="text-xl">📷</span>
            <span>Launch Attendance Scanner</span>
            <span className="group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
