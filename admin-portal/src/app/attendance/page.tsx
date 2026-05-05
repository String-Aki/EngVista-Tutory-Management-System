"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SNT from "@/components/StudentNameTransformer";

export default function AttendanceHub() {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics State
  const [todayCount, setTodayCount] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [cohortStats, setCohortStats] = useState<
    Record<string, { present: number; total: number }>
  >({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  // Date Range State (Defaults to current month)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Manual Check-In State
  const [manualModal, setManualModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualStatus, setManualStatus] = useState<"present" | "absent">("present");
  const [isProcessing, setIsProcessing] = useState(false);

  const getNowDate = () => new Date().toISOString().split("T")[0];
  const getNowTime = () => new Date().toTimeString().slice(0, 5);
  const [manualDate, setManualDate] = useState(getNowDate);
  const [manualTime, setManualTime] = useState(getNowTime);

  useEffect(() => {
    fetchData();
  }, [viewMode, startDate, endDate]); // Refetch when mode or dates change

  const fetchData = async () => {
    setIsLoading(true);

    // 1. Fetch all active students
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, full_name, grade_batch, qr_code, total_xp, cycle_classes")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    const studentsList = studentsData || [];
    setActiveStudents(studentsList);
    setTotalActive(studentsList.length);

    // 2. Fetch today's active schedules to compute EXPECTED headcount
    const todayDate = new Date();
    const todayDayOfWeek = todayDate.getDay();
    const todayStr = todayDate.toISOString().split("T")[0];

    const { data: todaySchedules } = await supabase
      .from("schedules")
      .select("target_grades, target_students, schedule_type, day_of_week, specific_date, is_active")
      .eq("is_active", true)
      .in("schedule_type", ["recurring", "one_time"]);

    // Union of all student IDs expected today across all applicable sessions
    const expectedStudentIds = new Set<string>();

    (todaySchedules || []).forEach(sch => {
      const isToday =
        (sch.schedule_type === "recurring" && sch.day_of_week === todayDayOfWeek) ||
        (sch.schedule_type === "one_time" && sch.specific_date === todayStr);

      if (!isToday) return;

      const isGlobal = (sch.target_grades?.length ?? 0) === 0 && (sch.target_students?.length ?? 0) === 0;

      if (isGlobal) {
        // All active students are expected
        studentsList.forEach(s => expectedStudentIds.add(s.id));
      } else {
        // Grade-targeted students
        (sch.target_grades || []).forEach((grade: string) => {
          studentsList.filter(s => s.grade_batch === grade).forEach(s => expectedStudentIds.add(s.id));
        });
        // Individually targeted students
        (sch.target_students || []).forEach((id: string) => expectedStudentIds.add(id));
      }
    });

    // Build cohort totals from EXPECTED students only (falls back to all if no sessions today)
    const expectedList = expectedStudentIds.size > 0
      ? studentsList.filter(s => expectedStudentIds.has(s.id))
      : studentsList;

    setTotalActive(expectedList.length); // repurpose totalActive to reflect expected count

    const stats: Record<string, { present: number; total: number }> = {};
    expectedList.forEach((s) => {
      const grade = s.grade_batch || "Unknown";
      if (!stats[grade]) stats[grade] = { present: 0, total: 0 };
      stats[grade].total += 1;
    });

    // 3. Build the Attendance Query
    let query = supabase
      .from("attendance_logs")
      .select(`id, scanned_at, status, student_id, student:student_id ( full_name, grade_batch, qr_code )`)
      .order("scanned_at", { ascending: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === "today") {
      query = query.gte("scanned_at", today.toISOString());
    } else {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.gte("scanned_at", start.toISOString()).lte("scanned_at", end.toISOString());
    }

    const { data: logsData } = await query;

    if (logsData) {
      setLogs(logsData);

      const todaysLogs = viewMode === "today"
        ? logsData
        : logsData.filter((log) => new Date(log.scanned_at) >= today);

      // Only count present/manual entries toward today's attendance (not absent)
      const presentLogsToday = todaysLogs.filter(log => log.status !== "absent");
      const uniqueStudentIdsToday = new Set(presentLogsToday.map((log) => log.student_id));
      setTodayCount(uniqueStudentIdsToday.size);

      uniqueStudentIdsToday.forEach((id) => {
        const student = studentsList.find((s) => s.id === id);
        if (student && stats[student.grade_batch]) {
          stats[student.grade_batch].present += 1;
        }
      });
      setCohortStats(stats);
    }

    setIsLoading(false);
  };


  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setIsProcessing(true);

    try {
      const student = activeStudents.find((s) => s.id === selectedStudentId);
      if (!student) throw new Error("Student not found");

      const timestamp = new Date(`${manualDate}T${manualTime}:00`).toISOString();
      const dayStart = new Date(`${manualDate}T00:00:00`).toISOString();
      const dayEnd = new Date(`${manualDate}T23:59:59`).toISOString();

      const { data: existing } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("student_id", student.id)
        .gte("scanned_at", dayStart)
        .lte("scanned_at", dayEnd)
        .single();

      if (existing) {
        alert(`A log already exists for this student on ${manualDate}.`);
        setIsProcessing(false);
        return;
      }

      await supabase.from("attendance_logs").insert([{
        student_id: student.id,
        scanned_at: timestamp,
        status: manualStatus === "absent" ? "absent" : "manual",
      }]);

      // Only award XP for present entries
      if (manualStatus === "present") {
        await supabase.from("xp_transactions").insert([{
          student_id: student.id,
          amount: 10,
          reason: "Manual Class Check-In",
        }]);
        await supabase
          .from("students")
          .update({ total_xp: student.total_xp + 10, cycle_classes: (student.cycle_classes || 0) + 1 })
          .eq("id", student.id);
      } else {
        // Absent — still counts toward total classes, no XP
        await supabase
          .from("students")
          .update({ cycle_classes: (student.cycle_classes || 0) + 1 })
          .eq("id", student.id);
      }

      setManualModal(false);
      setSelectedStudentId("");
      setManualStatus("present");
      setManualDate(getNowDate());
      setManualTime(getNowTime());
      fetchData();
    } catch (err) {
      console.error("Manual log failed:", err);
      alert("Failed to process entry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const studentName = log.student?.full_name?.toLowerCase() || "";
    const studentId = log.student?.qr_code?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    return studentName.includes(search) || studentId.includes(search);
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      {/* --- MANUAL CHECK-IN MODAL --- */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Manual Log Entry
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  Log a student's attendance manually.
                </p>
              </div>
              <div className="text-4xl">{manualStatus === "absent" ? "🚫" : "✍️"}</div>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Select Active Student
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-800"
                >
                  <option value="" disabled>
                    -- Choose a student --
                  </option>
                  {activeStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {SNT(s.full_name)} (Grade {s.grade_batch})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time override */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Time</label>
                  <input
                    type="time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Present / Absent Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualStatus("present")}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-sm border-2 transition-all ${
                    manualStatus === "present"
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                      : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  ✅ Present
                </button>
                <button
                  type="button"
                  onClick={() => setManualStatus("absent")}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-sm border-2 transition-all ${
                    manualStatus === "absent"
                      ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25"
                      : "bg-white text-slate-500 border-slate-200 hover:border-red-300"
                  }`}
                >
                  🚫 Absent
                </button>
              </div>

              <div className={`p-4 rounded-xl border text-sm font-medium ${
                manualStatus === "absent"
                  ? "bg-red-50 border-red-100 text-red-800"
                  : "bg-blue-50 border-blue-100 text-blue-800"
              }`}>
                {manualStatus === "absent"
                  ? <>This will be logged as <strong className="font-black">absent</strong>. No XP will be awarded.</>
                  : <>They will receive <strong className="font-black">+10 Base XP</strong> and their cycle counter will increment by 1.</>
                }
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setManualModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !selectedStudentId}
                  className={`flex-1 py-3 px-4 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50 ${
                    manualStatus === "absent"
                      ? "bg-red-500 hover:bg-red-400 shadow-red-500/30"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
                  }`}
                >
                  {isProcessing ? "Processing..." : manualStatus === "absent" ? "Log Absent" : "Check In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-100">
              ✅
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Attendance Ledger
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Live Scanned feed, manual entries, and historical tracking.
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={fetchData}
              className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              ↻ Sync Feed
            </button>
            <button
              onClick={() => setManualModal(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all shadow-md"
            >
              + Manual Entry
            </button>
          </div>
        </header>

        {/* ANALYTICS ROW */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl border border-indigo-100 relative z-10 shrink-0">
              🏫
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Present Today
              </p>
              <p className="text-3xl font-black text-slate-800 font-mono mt-0.5">
                {todayCount}{" "}
                <span className="text-lg text-slate-400">/ {totalActive}</span>
              </p>
            </div>
          </div>

          {/*COHORT STATS CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>📊</span> Turnout by Grade (Today)
              </p>
              <div className="max-h-20 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {Object.keys(cohortStats).length === 0 ? (
                  <p className="text-sm font-medium text-slate-400">
                    No active students.
                  </p>
                ) : (
                  Object.entries(cohortStats)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([grade, stats]) => (
                      <div
                        key={grade}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-bold text-slate-700">
                          Grade {grade}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-600">
                            {stats.present}/{stats.total}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stats.present === stats.total ? "bg-emerald-500" : stats.present > 0 ? "bg-blue-500" : "bg-slate-300"}`}
                              style={{
                                width: `${(stats.present / Math.max(stats.total, 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center gap-5">
            <div className="text-center w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                View Mode
              </p>
              <div className="flex bg-slate-100 p-1 rounded-lg w-full">
                <button
                  onClick={() => setViewMode("today")}
                  className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === "today" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Live Feed
                </button>
                <button
                  onClick={() => setViewMode("all")}
                  className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${viewMode === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                {viewMode === "today"
                  ? "Today's Live Roster"
                  : "Historical Check-In Data"}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {viewMode === "today"
                  ? "Students who have scanned in today."
                  : "Filterable scan history."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {viewMode === "all" && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm font-bold text-slate-600 outline-none bg-transparent"
                  />
                  <span className="text-slate-300 font-bold">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm font-bold text-slate-600 outline-none bg-transparent"
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 shadow-sm font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {isLoading ? (
              <div className="p-16 text-center animate-pulse text-slate-400 font-bold text-lg">
                Loading scan data...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4 opacity-50 grayscale">📭</div>
                <p className="text-slate-400 font-medium">
                  No check-ins found for this view.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                    <th className="p-5 font-bold whitespace-nowrap">
                      Date & Time
                    </th>
                    <th className="p-5 font-bold">Student</th>
                    <th className="p-5 font-bold">Student ID</th>
                    <th className="p-5 font-bold text-right">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-5 whitespace-nowrap">
                        <p className="font-bold text-slate-700">
                          {new Date(log.scanned_at).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs font-black text-blue-600 mt-0.5">
                          {new Date(log.scanned_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      <td className="p-5">
                        <p className="font-bold text-slate-800 text-base">
                          {SNT(log.student?.full_name || "Unknown")}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Grade {log.student?.grade_batch}
                        </p>
                      </td>

                      <td className="p-5">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold border border-slate-200">
                          {log.student?.qr_code || "N/A"}
                        </span>
                      </td>

                      <td className="p-5 text-right">
                        {log.status === "absent" ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider">
                            <span>🚫</span> Absent
                          </span>
                        ) : log.status === "manual" ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider">
                            <span>✍️</span> Manual
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider">
                            <span>📱</span> Scanned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
