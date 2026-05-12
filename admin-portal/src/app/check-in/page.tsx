"use client";

import { useState, useEffect } from "react";
import AttendanceScanner from "@/components/AttendanceScanner";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

export type TodaySession = {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  schedule_type: string;
  target_grades: string[];
  target_students: string[];
  _origin: "regular" | "override";
};

export default function AttendanceKiosk() {
  const [lastScanned, setLastScanned] = useState<any | null>(null);
  const [isOfflineScan, setIsOfflineScan] = useState(false);
  const [isDuplicateScan, setIsDuplicateScan] = useState(false);

  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [manualSessionId, setManualSessionId] = useState<string | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<"loading" | "ready" | "none">("loading");
  const [scheduleNote, setScheduleNote] = useState("");

  useEffect(() => {
    const fetchTodaySessions = async () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const localDateStr = `${year}-${month}-${day}`;
      const dayOfWeek = today.getDay();

      try {
        const { data: allSchedules, error } = await supabase
          .from("schedules")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;
        if (!allSchedules || allSchedules.length === 0) {
          setScheduleStatus("none");
          setScheduleNote("No class today");
          return;
        }

        // Find base classes for today
        const baseToday = allSchedules.filter(s =>
          (s.schedule_type === "recurring" && s.day_of_week === dayOfWeek) ||
          (s.schedule_type === "one_time" && s.specific_date === localDateStr)
        );

        // Find cross-day reschedule overrides landing today
        const rescheduleOverridesToday = allSchedules.filter(s =>
          s.schedule_type === "override" &&
          s.override_action === "reschedule" &&
          s.specific_date === localDateStr
        );

        const toLocalDate = (timeStr: string): Date => {
          const [h, m] = timeStr.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          return d;
        };
        const now = new Date();

        // Build the final session list, applying per-schedule overrides
        const sessions: TodaySession[] = [];

        for (const base of baseToday) {
          const override = allSchedules.find(s =>
            s.schedule_type === "override" &&
            s.parent_schedule_id === base.id &&
            s.specific_date === localDateStr
          );

          if (override) {
            if (override.override_action === "cancel") continue;
            if (override.override_action === "reschedule") {
              sessions.push({
                id: base.id,
                title: base.title,
                start_time: override.start_time,
                end_time: override.end_time,
                schedule_type: base.schedule_type,
                target_grades: base.target_grades || [],
                target_students: base.target_students || [],
                _origin: "override",
              });
              continue;
            }
          }

          sessions.push({
            id: base.id,
            title: base.title,
            start_time: base.start_time,
            end_time: base.end_time,
            schedule_type: base.schedule_type,
            target_grades: base.target_grades || [],
            target_students: base.target_students || [],
            _origin: "regular",
          });
        }

        for (const ov of rescheduleOverridesToday) {
          const alreadyIncluded = sessions.some(s => s.id === ov.parent_schedule_id);
          if (!alreadyIncluded) {
            sessions.push({
              id: ov.parent_schedule_id || ov.id,
              title: ov.title,
              start_time: ov.start_time,
              end_time: ov.end_time,
              schedule_type: "one_time",
              target_grades: ov.target_grades || [],
              target_students: ov.target_students || [],
              _origin: "override",
            });
          }
        }

        const activeSessions = sessions.filter(s => {
          if (!s.end_time) return true;
          return toLocalDate(s.end_time) > now;
        });

        activeSessions.sort((a, b) => {
          const aT = a.start_time ? toLocalDate(a.start_time).getTime() : 0;
          const bT = b.start_time ? toLocalDate(b.start_time).getTime() : 0;
          return aT - bT;
        });

        if (activeSessions.length === 0) {
          setScheduleStatus("none");
          setScheduleNote("No class today");
          return;
        }

        setTodaySessions(activeSessions);
        setManualSessionId(activeSessions[0].id);
        setScheduleStatus("ready");

        if (activeSessions.length === 1) {
          const s = activeSessions[0];
          setScheduleNote(
            s._origin === "override"
              ? "Rescheduled session"
              : s.schedule_type === "one_time"
                ? "Special session today"
                : "Regular class today"
          );
        } else {
          setScheduleNote(`${activeSessions.length} sessions today`);
        }

      } catch (error) {
        console.error("Error fetching schedule:", error);
        setScheduleStatus("none");
      }
    };

    fetchTodaySessions();
  }, []);

  const handleSuccessfulScan = (
    studentData: any,
    offline: boolean,
    duplicate: boolean,
  ) => {
    setLastScanned(studentData);
    setIsOfflineScan(offline);
    setIsDuplicateScan(duplicate);
  };

  const selectedSession = todaySessions.find(s => s.id === manualSessionId) || null;
  const isMultiSession = todaySessions.length > 1;

  return (
    <main className="h-[100dvh] bg-slate-100 p-3 md:p-4 flex flex-col font-sans overflow-hidden">
      {/* --- HEADER BAR --- */}
      <header className="flex items-center gap-4 bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-slate-200/60 mb-3 shrink-0">
        {/* Exit + Logo */}
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
          title="Exit Scanner"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative w-11 h-11 border-2 border-slate-800 rounded-xl shadow overflow-hidden shrink-0">
          <Image
            src="/icon.png"
            alt="ENGVISTA Logo"
            fill
            sizes="44px"
            className="object-cover"
            priority
          />
        </div>

        <div className="mr-auto min-w-0">
          <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight hidden sm:block">ENGVISTA</h1>
          <h1 className="text-base sm:hidden font-black text-slate-800 tracking-tight leading-tight">Scan Desk</h1>
          <p className="text-slate-400 text-xs font-medium leading-tight hidden sm:block">Scan Desk</p>
        </div>

        {/* Session Dropdown (multi-session only) */}
        {isMultiSession && (
          <div className="relative shrink-0 hidden sm:block">
            <select
              value={manualSessionId || ""}
              onChange={(e) => setManualSessionId(e.target.value)}
              className="appearance-none bg-white border-2 border-blue-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 pr-9 outline-none focus:border-blue-400 cursor-pointer"
            >
              {todaySessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.start_time})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Schedule Time Pill */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-xl border shrink-0 ${
            scheduleStatus === "ready" && selectedSession?._origin === "override"
              ? "bg-amber-50 border-amber-200"
              : scheduleStatus === "ready"
                ? "bg-blue-50 border-blue-200"
                : "bg-slate-50 border-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${
              scheduleStatus === "ready" && selectedSession?._origin === "override"
                ? "bg-amber-100"
                : scheduleStatus === "ready"
                  ? "bg-blue-100"
                  : "bg-slate-200"
            }`}
          >
            {scheduleStatus === "ready" && selectedSession?._origin === "override"
              ? "⚠️"
              : scheduleStatus === "ready"
                ? "⏱️"
                : "🗓️"}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {scheduleStatus === "loading" ? "Loading..." : scheduleNote}
            </p>
            {scheduleStatus === "ready" && selectedSession ? (
              <p className="text-sm font-black text-slate-800 font-mono tracking-tight leading-tight">
                {selectedSession.start_time} — {selectedSession.end_time || "??:??"}
              </p>
            ) : (
              <p className="text-sm font-bold text-slate-400 leading-tight">
                {scheduleStatus === "loading" ? "..." : "Offline"}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* --- DASHBOARD LAYOUT --- */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 relative">
        {/* MAIN: SCANNER */}
        <section className="flex-1 lg:w-1/2 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-slate-50 to-transparent z-0"></div>
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <AttendanceScanner
              todaySessions={todaySessions}
              manualSessionId={manualSessionId}
              onScanSuccess={handleSuccessfulScan}
            />
          </div>
        </section>

        {/* FEEDBACK UI (Overlay on Mobile, Side Panel on Desktop) */}
        <section className={`absolute inset-0 lg:static lg:w-1/2 flex flex-col min-h-0 z-50 pointer-events-none lg:pointer-events-auto transition-opacity duration-300 ${!lastScanned && !isDuplicateScan ? "opacity-0 lg:opacity-100" : "opacity-100"}`}>
          <div className="flex-1 flex flex-col justify-end lg:justify-center p-4 lg:p-0 pb-8 lg:pb-0">
            <div
              className={`rounded-3xl lg:rounded-2xl shadow-2xl lg:shadow-sm border p-6 lg:p-8 w-full max-w-md mx-auto lg:max-w-none lg:h-full lg:flex lg:flex-col relative overflow-hidden transition-all duration-500 pointer-events-auto ${isDuplicateScan ? "bg-amber-50 border-amber-200" : lastScanned ? "bg-slate-900 border-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.6)]" : "bg-white border-slate-200/60 hidden lg:flex"}`}
            >
            {lastScanned ? (
              <div className="flex flex-col items-center justify-center flex-1 animate-in slide-in-from-bottom-8 fade-in duration-300 relative z-10">
                {/* Profile Avatar */}
                <div
                  className={`w-20 h-20 lg:w-32 lg:h-32 rounded-full mb-4 lg:mb-5 shadow-xl border-4 lg:border-[6px] flex items-center justify-center text-4xl lg:text-5xl transform transition-transform hover:scale-105 ${isDuplicateScan ? "bg-amber-100 border-amber-200 text-amber-500" : isOfflineScan ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-800 border-emerald-500/30 text-emerald-400"}`}
                >
                  {isDuplicateScan ? "🛑" : isOfflineScan ? "📦" : "👤"}
                </div>

                <h3 className={`text-2xl lg:text-4xl font-black text-center mb-1 tracking-tight ${isDuplicateScan ? "text-slate-800" : "text-white"}`}>
                  {lastScanned.full_name}
                </h3>
                <p className={`text-sm lg:text-base font-bold tracking-widest uppercase mb-4 lg:mb-5 ${isDuplicateScan ? "text-amber-600/70" : "text-slate-400"}`}>
                  {lastScanned.grade_batch}
                </p>

                {/* Matched Session Label */}
                {lastScanned._matchedSessionTitle && !isDuplicateScan && (
                  <p className="text-[10px] font-bold text-amber-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 mb-4 lg:mb-6 shadow-inner">
                    Matched → {lastScanned._matchedSessionTitle}
                  </p>
                )}

                {/* Status Banners */}
                {isDuplicateScan ? (
                  <div className="bg-white border-2 border-amber-200 p-4 rounded-2xl w-full max-w-sm text-center shadow-lg">
                    <p className="text-lg font-black text-amber-600 uppercase tracking-widest mb-1">
                      Access Logged
                    </p>
                    <p className="text-slate-600 font-medium text-sm">
                      Already checked in for this session.
                    </p>
                  </div>
                ) : (
                  <div
                    className={`w-full max-w-sm rounded-2xl overflow-hidden border ${isOfflineScan ? "bg-slate-800 border-slate-700" : "bg-emerald-500/10 border-emerald-500/30"} backdrop-blur-md`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isOfflineScan ? "text-slate-400" : "text-emerald-400/80"}`}>
                          Attendance
                        </p>
                        <p
                          className={`text-xl lg:text-2xl font-black tracking-tight ${isOfflineScan ? "text-slate-300" : "text-emerald-400"}`}
                        >
                          Checked In ✓
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center">
                        {isOfflineScan ? (
                          <p className="text-xs font-bold text-slate-300 bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600">
                            Syncing Later
                          </p>
                        ) : (
                          <p className="text-sm font-black text-emerald-950 bg-emerald-400 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-pulse">
                            Present ✅
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 relative z-10 text-center px-4 lg:py-12">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-slate-50 rounded-full mb-6 flex items-center justify-center shadow-inner border-2 border-slate-100">
                  <span className="text-3xl lg:text-4xl opacity-50 text-slate-400">📸</span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-black text-slate-300 tracking-tight mb-2">
                  Ready to Scan
                </h2>
                <p className="text-slate-400 font-medium text-sm lg:text-base max-w-[200px] lg:max-w-xs mx-auto">
                  Hold the student's ID card up to the camera to check in.
                </p>
              </div>
            )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
