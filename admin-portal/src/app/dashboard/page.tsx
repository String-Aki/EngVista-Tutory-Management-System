"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MainDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    droppedStudents: 0,
    pendingFees: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    pendingPrints: 0,
    todayAttendance: 0,
  });

  useEffect(() => {
    // TODO: Re-enable auth check after inspection
    // const checkSession = async () => {
    //   const { data: { session } } = await supabase.auth.getSession();
    //   if (!session) {
    //     router.push("/");
    //   } else {
    //     setIsCheckingAuth(false);
    //     fetchGlobalStats();
    //   }
    // };
    // checkSession();
    setIsCheckingAuth(false);
    fetchGlobalStats();
  }, [router]);

  const fetchGlobalStats = async () => {
    setIsLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const currentMonthStr = today.toISOString().slice(0, 7); // "YYYY-MM"

    try {
      const [
        { data: studentsData },
        { data: paymentsData },
        { count: printCount },
        { data: attendanceData },
      ] = await Promise.all([
        supabase.from("students").select("is_active, cycle_classes"),
        supabase.from("payments").select("amount, paid_at"),
        supabase
          .from("card_print_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("attendance_logs")
          .select("student_id")
          .gte("scanned_at", todayStr),
      ]);

      let active = 0;
      let dropped = 0;
      let dueFees = 0;

      if (studentsData) {
        studentsData.forEach((s) => {
          if (s.is_active) {
            active++;
            if (s.cycle_classes >= 8) dueFees++;
          } else {
            dropped++;
          }
        });
      }

      let monthlyRev = 0;
      let totalRev = 0;
      if (paymentsData) {
        paymentsData.forEach((p) => {
          const amt = Number(p.amount) || 0;
          totalRev += amt;
          if (p.paid_at.startsWith(currentMonthStr)) {
            monthlyRev += amt;
          }
        });
      }

      let uniqueToday = 0;
      if (attendanceData) {
        const uniqueIds = new Set(attendanceData.map((a) => a.student_id));
        uniqueToday = uniqueIds.size;
      }

      setStats({
        activeStudents: active,
        droppedStudents: dropped,
        pendingFees: dueFees,
        monthlyRevenue: monthlyRev,
        totalRevenue: totalRev,
        pendingPrints: printCount || 0,
        todayAttendance: uniqueToday,
      });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -z-0 opacity-50"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-2">
              {getGreeting()}, Ma'am.
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Here is what is happening at the cram today.
            </p>
          </div>
          <div className="relative z-10 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm font-bold text-slate-600 flex items-center gap-3">
            <span className="text-xl">📅</span>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-bold animate-pulse text-xl">
            Compiling academy metrics...
          </div>
        ) : (
          <>
            {/* --- ACTION ALERTS (Only show if there's work to do) --- */}
            {(stats.pendingFees > 0 ||
              stats.pendingPrints > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.pendingFees > 0 && (
                  <Link
                    href="/payments"
                    className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between group hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-lg">
                        💰
                      </div>
                      <div>
                        <p className="text-sm font-black text-red-800 uppercase tracking-widest">
                          {stats.pendingFees} Fees Due
                        </p>
                        <p className="text-xs font-bold text-red-600 mt-0.5">
                          Collect payments
                        </p>
                      </div>
                    </div>
                    <span className="text-red-400 group-hover:translate-x-1 transition-transform font-bold">
                      →
                    </span>
                  </Link>
                )}

                {stats.pendingPrints > 0 && (
                  <Link
                    href="/print-hub"
                    className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between group hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-lg">
                        🖨️
                      </div>
                      <div>
                        <p className="text-sm font-black text-amber-800 uppercase tracking-widest">
                          {stats.pendingPrints} Cards Queued
                        </p>
                        <p className="text-xs font-bold text-amber-600 mt-0.5">
                          Ready for batch printing
                        </p>
                      </div>
                    </div>
                    <span className="text-amber-400 group-hover:translate-x-1 transition-transform font-bold">
                      →
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* --- PRIMARY KPI METRICS --- */}
            {/* --- PRIMARY KPI METRICS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
                    👥
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                    Active Roster
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800 font-mono tracking-tight">
                    {stats.activeStudents}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 mt-1">
                    {stats.droppedStudents} historical dropouts
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 shrink-0 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                    📈
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                    This Month
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-black text-emerald-600 font-mono tracking-tight">
                    Rs {stats.monthlyRevenue.toLocaleString()}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 mt-1 truncate pr-2">
                    Rs {stats.totalRevenue.toLocaleString()} All-Time
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 shrink-0 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-2xl">
                    🏫
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                    Today's Turnout
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800 font-mono tracking-tight">
                    {stats.todayAttendance}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 mt-1">
                    Student check-ins
                  </p>
                </div>
              </div>
            </div>

            {/* --- NAVIGATION GRID --- */}
            <div>
              <h2 className="text-xl font-black text-slate-800 mb-6">
                Management Hubs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <Link
                  href="/students"
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🎓
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                      Students Hub
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Manage students, track dropouts, and promote students to new
                    grades.
                  </p>
                </Link>

                <Link
                  href="/payments"
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      💳
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                      Financials
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Collect cycle fees, manage pending dues, and review the
                    revenue ledger.
                  </p>
                </Link>

                <Link
                  href="/attendance"
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      ✅
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                      Attendance
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Monitor live scanned check-ins, view cohort turnout, and log
                    manual entries.
                  </p>
                </Link>

                <Link
                  href="/print-hub"
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🖨️
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                      Print Logistics
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Batch export newly enrolled and promoted student IDs to
                    physical A4 pages.
                  </p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
