"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Users, CreditCard, TrendingUp, AlertCircle, ArrowRight, Clock, CheckCircle, Printer } from "lucide-react";

export default function MainDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    attendanceRate: 0,
    pendingPaymentsCount: 0,
  });

  const [actionRequiredStudents, setActionRequiredStudents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    try {
      // 1. Fetch Students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name, is_active, sessions_attended");

      if (studentsError) throw studentsError;

      // Create student lookup map
      const studentMap = new Map();
      let activeStudentsCount = 0;
      let pendingPaymentsCount = 0;
      const pendingStudents: any[] = [];

      (studentsData || []).forEach((s) => {
        studentMap.set(s.id, s);
        if (s.is_active) {
          activeStudentsCount++;
          if (s.sessions_attended >= 8) {
            pendingPaymentsCount++;
            pendingStudents.push(s);
          }
        }
      });

      // 2. Fetch Attendance (Today for rate, plus 10 recent overall)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("id, student_id, scanned_at")
        .order("scanned_at", { ascending: false })
        .limit(100); // Fetch enough to find today's unique AND recent 10

      if (attendanceError) throw attendanceError;

      const uniqueTodayIds = new Set();
      const recentAttendances: any[] = [];

      (attendanceData || []).forEach((a) => {
        if (new Date(a.scanned_at) >= today) {
          uniqueTodayIds.add(a.student_id);
        }
        if (recentAttendances.length < 10) {
          recentAttendances.push({
            ...a,
            type: 'check_in',
            timestamp: new Date(a.scanned_at)
          });
        }
      });

      const attendanceRate = activeStudentsCount > 0 
        ? Math.round((uniqueTodayIds.size / activeStudentsCount) * 100) 
        : 0;

      // 3. Fetch Recent Payments (last 10)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("id, student_id, amount, paid_at")
        .order("paid_at", { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;

      const recentPayments = (paymentsData || []).map(p => ({
        ...p,
        type: 'payment',
        timestamp: new Date(p.paid_at)
      }));

      // Combine and sort recent activity
      const combinedActivity = [...recentAttendances, ...recentPayments]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(activity => ({
          ...activity,
          student: studentMap.get(activity.student_id) || { first_name: 'Unknown', last_name: 'Student' }
        }));

      setStats({
        activeStudents: activeStudentsCount,
        attendanceRate: attendanceRate,
        pendingPaymentsCount: pendingPaymentsCount,
      });

      setActionRequiredStudents(pendingStudents);
      setRecentActivity(combinedActivity);

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
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

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-bl-full -z-0 opacity-50"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-navy-900 tracking-tight mb-2 text-slate-800">
              {getGreeting()}, Ma'am.
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Here is your English Tutory App overview today.
            </p>
          </div>
          <div className="relative z-10 bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm font-bold text-slate-600 flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
             <p className="text-slate-400 font-bold animate-pulse text-lg">Loading dashboard data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* --- THE VITALS WIDGET --- */}
            <section>
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                The Vitals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Active Students */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">
                      Total Active Students
                    </span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-800 font-mono tracking-tight">
                      {stats.activeStudents}
                    </h3>
                  </div>
                </div>

                {/* Today's Attendance Rate */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 shrink-0 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">
                      Today's Attendance Rate
                    </span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-emerald-600 font-mono tracking-tight">
                      {stats.attendanceRate}%
                    </h3>
                  </div>
                </div>

                {/* Pending Payments */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 shrink-0 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">
                      Pending Payments
                    </span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-amber-600 font-mono tracking-tight">
                      {stats.pendingPaymentsCount}
                    </h3>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* --- ACTION REQUIRED WIDGET --- */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    Action Required
                  </h2>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                    {actionRequiredStudents.length} Students
                  </span>
                </div>
                
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {actionRequiredStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium flex flex-col items-center">
                      <CheckCircle className="w-12 h-12 text-emerald-200 mb-3" />
                      All caught up! No pending payments.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                      {actionRequiredStudents.map((student) => (
                        <div key={student.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                {student.sessions_attended} sessions attended
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/payments?studentId=${student.id}`}
                            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors"
                          >
                            Go to Ledger
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* --- RECENT ACTIVITY WIDGET --- */}
              <section>
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-500" />
                  Recent Activity
                </h2>
                
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-h-[400px] overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="text-center text-slate-500 font-medium py-8">
                      No recent activity.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {recentActivity.map((activity, idx) => (
                        <div key={`${activity.type}-${activity.id}-${idx}`} className="flex gap-4">
                          <div className="relative flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                              activity.type === 'payment' 
                                ? 'bg-emerald-100 text-emerald-600' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {activity.type === 'payment' ? <CreditCard className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            </div>
                            {idx !== recentActivity.length - 1 && (
                              <div className="w-px h-full bg-slate-200 absolute top-10"></div>
                            )}
                          </div>
                          <div className="pt-2 pb-4">
                            <p className="text-sm font-bold text-slate-800">
                              {activity.student.first_name} {activity.student.last_name}
                              {activity.type === 'payment' 
                                ? ` paid Rs ${activity.amount}`
                                : ' checked in for class'}
                            </p>
                            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            {/* Quick Navigation Footer */}
            <section className="pt-4">
              <div className="flex flex-wrap gap-4">
                <Link href="/students" className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center gap-2 shadow-sm">
                  <Users className="w-4 h-4" /> Students Hub
                </Link>
                <Link href="/payments" className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center gap-2 shadow-sm">
                  <CreditCard className="w-4 h-4" /> Financials
                </Link>
                <Link href="/attendance" className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-2 shadow-sm">
                  <CheckCircle className="w-4 h-4" /> Attendance Scanner
                </Link>
                <Link href="/print-hub" className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-colors flex items-center gap-2 shadow-sm">
                  <Printer className="w-4 h-4" /> Print Hub
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
