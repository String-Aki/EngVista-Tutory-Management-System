"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Sparkles, ArrowLeft, Inbox } from "lucide-react";

export default function XpLedgerPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/");
        return;
      }

      try {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("total_xp")
          .eq("id", studentId)
          .single();

        if (studentError) throw studentError;
        setTotalXp(studentData.total_xp);

        const { data: txData, error: txError } = await supabase
          .from("xp_transactions")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (txError) throw txError;
        setTransactions(txData || []);
      } catch (error) {
        console.error("Error fetching XP ledger:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedger();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-amber-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Decrypting Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-amber-500 selection:text-white pb-24 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        {/* Header */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 flex items-center gap-4">
              <Sparkles className="w-10 h-10 text-amber-500" /> XP Ledger
            </h1>
            <p className="text-amber-300 font-bold uppercase tracking-widest text-xs">
              Transaction History
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-4 rounded-2xl text-center md:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Earned
            </p>
            <p className="text-3xl font-black text-amber-400">
              {totalXp} <span className="text-lg text-amber-400/50">XP</span>
            </p>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md animate-in fade-in duration-700 flex flex-col items-center justify-center">
            <Inbox className="w-16 h-16 mb-4 text-slate-400 opacity-30" />
            <p className="font-bold text-slate-400">Your ledger is empty.</p>
            <p className="text-sm text-slate-500 mt-2">
              Complete quests and attend classes to earn XP!
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8">
            {transactions.map((tx, index) => {
              const isPositive = tx.amount > 0;
              const sign = isPositive ? "+" : "";
              const colorTheme = isPositive ? "text-amber-400" : "text-red-400";
              const bgTheme = isPositive ? "bg-amber-400/10" : "bg-red-400/10";
              const borderTheme = isPositive
                ? "border-amber-400/30"
                : "border-red-400/30";

              return (
                <div
                  key={tx.id}
                  className="relative animate-in slide-in-from-bottom-8 fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-[35px] md:-left-[41px] top-2 w-4 h-4 rounded-full border-4 border-[#020617] ${isPositive ? "bg-amber-400" : "bg-red-400"} shadow-[0_0_10px_rgba(251,191,36,0.5)]`}
                  ></div>

                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-black text-lg text-slate-200 group-hover:text-white transition-colors">
                          {tx.reason}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                          {new Date(tx.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>

                      <div
                        className={`shrink-0 px-4 py-2 rounded-xl border ${borderTheme} ${bgTheme} flex items-center justify-center`}
                      >
                        <span className={`font-black text-xl ${colorTheme}`}>
                          {sign}
                          {tx.amount} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
