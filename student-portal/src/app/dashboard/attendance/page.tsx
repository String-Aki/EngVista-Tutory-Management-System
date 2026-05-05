"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, CalendarDays, CheckCircle2, XCircle } from "lucide-react";

export default function AttendancePage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("attendance_logs")
          .select("scanned_at, status")
          .eq("student_id", studentId)
          .order("scanned_at", { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-24 relative overflow-hidden">
      
      {/* Light Emerald Ambient Orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm mb-2 flex items-center gap-4">
            <CalendarDays className="w-10 h-10 text-emerald-500" /> Attendance Log
          </h1>
          <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">
            Track Your Consistency
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
          {history.length === 0 ? (
            <div className="text-center py-12 font-bold text-slate-400 flex flex-col items-center justify-center">
              <CalendarDays className="w-16 h-16 mb-4 text-slate-300 opacity-50" />
              No classes logged yet.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, i) => {
                const isAbsent = record.status === "absent";
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 border rounded-2xl shadow-sm transition-colors ${
                      isAbsent
                        ? "bg-red-50/60 border-red-100 hover:bg-red-50"
                        : "bg-slate-50 hover:bg-emerald-50/50 border-slate-100 hover:border-emerald-200 group"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border transition-all ${
                        isAbsent
                          ? "bg-red-100 border-red-200"
                          : "bg-white border-slate-100 group-hover:border-emerald-200 group-hover:shadow-emerald-100"
                      }`}>
                        {isAbsent
                          ? <XCircle className="w-6 h-6 text-red-400" />
                          : <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                      </div>
                      <div>
                        <p className={`font-black text-lg leading-tight transition-colors ${
                          isAbsent ? "text-red-700" : "text-slate-800 group-hover:text-emerald-900"
                        }`}>
                          {new Date(record.scanned_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {new Date(record.scanned_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm shrink-0 ${
                      isAbsent
                        ? "bg-red-100 text-red-600 border-red-200"
                        : "bg-emerald-100 text-emerald-700 border-emerald-200"
                    }`}>
                      {isAbsent ? "Absent" : "Present"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}