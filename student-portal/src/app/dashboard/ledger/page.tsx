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
          .from("xp_logs")
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-amber-600 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-100 selection:text-slate-900 pb-24 relative overflow-hidden">
      {/* Removed dark mode ambience */}

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        {/* Header */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white hover:bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm mb-2 flex items-center gap-4">
              <Sparkles className="w-10 h-10 text-amber-500" /> Points Ledger
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              Transaction History
            </p>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm backdrop-blur-md px-6 py-4 rounded-2xl text-center md:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Earned
            </p>
            <p className="text-3xl font-black text-amber-500">
              {totalXp} <span className="text-lg text-amber-500/70">XP</span>
            </p>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm backdrop-blur-md animate-in fade-in duration-700 flex flex-col items-center justify-center">
            <Inbox className="w-16 h-16 mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">Your ledger is empty.</p>
            <p className="text-sm text-slate-400 mt-2">
              Complete quests and attend classes to earn XP!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4">
            <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8 min-w-[300px]">
            {transactions.map((tx, index) => {
              const isPositive = tx.amount > 0;
              const sign = isPositive ? "+" : "";
              const colorTheme = isPositive ? "text-amber-600" : "text-red-600";
              const bgTheme = isPositive ? "bg-amber-50" : "bg-red-50";
              const borderTheme = isPositive
                ? "border-amber-200"
                : "border-red-200";

              return (
                <div
                  key={tx.id}
                  className="relative animate-in slide-in-from-bottom-8 fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-[35px] md:-left-[41px] top-2 w-4 h-4 rounded-full border-4 border-slate-50 ${isPositive ? "bg-amber-400" : "bg-red-400"} shadow-sm`}
                  ></div>

                  <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl hover:border-slate-300 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-black text-lg text-slate-800 group-hover:text-slate-900 transition-colors">
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
          </div>
        )}
      </div>
    </div>
  );
}
