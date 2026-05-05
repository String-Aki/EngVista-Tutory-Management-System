"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CalendarDays, Clock, AlertTriangle, CheckCircle2, MoveRight } from "lucide-react";

type Schedule = {
  id: string; title: string; schedule_type: string; parent_schedule_id: string | null;
  override_action: string | null; day_of_week: number | null; specific_date: string | null;
  start_time: string | null; end_time: string | null; target_grades: string[]; target_students: string[];
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Converts "14:30" or "14:30:00" → "2:30 PM" */
function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function StudentScheduleTimeline() {
  const router = useRouter();
  const [timelineDates, setTimelineDates] = useState<Date[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    setTimelineDates(dates);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const activeStudentId = localStorage.getItem("icms_active_student");
    if (!activeStudentId) { router.replace("/"); return; }

    const { data: studentData, error: studentError } = await supabase
      .from("students").select("id, grade_batch").eq("id", activeStudentId).single();

    if (studentError?.code === "PGRST116") {
      localStorage.removeItem("icms_active_student");
      router.replace("/");
      return;
    }
    if (!studentData) return;

    const { data: allSchedules } = await supabase
      .from("schedules").select("*").eq("is_active", true).order("created_at", { ascending: false });

    if (allSchedules) {
      const targeted = allSchedules.filter(sch => {
        const isGlobal = sch.target_grades.length === 0 && sch.target_students.length === 0;
        const matchesGrade = sch.target_grades.includes(studentData.grade_batch);
        const matchesStudent = sch.target_students.includes(studentData.id);
        return isGlobal || matchesGrade || matchesStudent;
      });
      setSchedules(targeted);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <CalendarDays className="w-12 h-12 text-blue-300 animate-pulse mb-6" />
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">Syncing Timeline...</p>
      </div>
    );
  }

  const recurringBase = schedules.filter(s => s.schedule_type === "recurring");
  const oneTimeBase   = schedules.filter(s => s.schedule_type === "one_time");
  const overrides     = schedules.filter(s => s.schedule_type === "override");

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none fixed">
        <div className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_rgba(253,230,138,0.2)_0%,_transparent_60%)]" />
        <div className="absolute bottom-[10%] -left-[10%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_rgba(191,219,254,0.3)_0%,_transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-6 active:scale-95 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-amber-500" /> My Timeline
          </h1>
          <p className="text-slate-500 font-medium mt-1">Your upcoming 14 days, carefully tailored to you.</p>
        </div>

        <div className="space-y-8">
          {timelineDates.map(dateObj => {
            const dayOfWeek = dateObj.getDay();
            const year  = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day   = String(dateObj.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            const todaysRecurring = recurringBase.filter(s => s.day_of_week === dayOfWeek);
            const todaysOneTime   = oneTimeBase.filter(s => s.specific_date === dateStr);
            const dailyEventsRaw  = [...todaysRecurring, ...todaysOneTime];

            const resolvedEvents: any[] = [];

            // Pass 1: base events naturally on this day
            dailyEventsRaw.forEach(event => {
              const relevantOverride = overrides.find(
                o => o.parent_schedule_id === event.id && o.specific_date === dateStr
              );
              if (relevantOverride) {
                if (relevantOverride.override_action === "cancel") {
                  resolvedEvents.push({ ...event, isCancelled: true });
                } else if (relevantOverride.override_action === "reschedule") {
                  resolvedEvents.push({
                    ...event,
                    start_time: relevantOverride.start_time,
                    end_time: relevantOverride.end_time,
                    isRescheduled: true,
                    rescheduleNote: "Time changed for this session",
                  });
                }
              } else {
                resolvedEvents.push({ ...event });
              }
            });

            // Pass 2: cross-day reschedules landing on this day
            const standaloneReschedules = overrides.filter(
              o => o.override_action === "reschedule" && o.specific_date === dateStr
            );
            standaloneReschedules.forEach(o => {
              if (!resolvedEvents.some(r => r.id === o.parent_schedule_id)) {
                const parent = schedules.find(p => p.id === o.parent_schedule_id);
                if (parent) {
                  const originalDay = parent.day_of_week !== null ? DAYS[parent.day_of_week] : null;
                  resolvedEvents.push({
                    ...parent,
                    start_time: o.start_time,
                    end_time: o.end_time,
                    isRescheduled: true,
                    rescheduleNote: originalDay ? `Moved from ${originalDay}` : "Rescheduled session",
                  });
                }
              }
            });

            // Pass 3: mark original occurrences as MOVED AWAY if cross-day override exists
            resolvedEvents.forEach((ev, idx) => {
              if (ev.isCancelled || ev.isRescheduled || ev.isMovedAway) return;
              const crossDayOverride = overrides.find(
                o =>
                  o.parent_schedule_id === ev.id &&
                  o.override_action === "reschedule" &&
                  o.specific_date !== dateStr
              );
              if (crossDayOverride) {
                const newDate = crossDayOverride.specific_date
                  ? new Date(crossDayOverride.specific_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                  : null;
                const newTime = crossDayOverride.start_time ? formatTime(crossDayOverride.start_time) : null;
                const movedTo = [newDate, newTime].filter(Boolean).join(" at ");
                resolvedEvents[idx] = {
                  ...ev,
                  isMovedAway: true,
                  movedToNote: movedTo ? `→ Moved to ${movedTo}` : "→ Moved to another session",
                };
              }
            });

            if (resolvedEvents.length === 0) return null;

            const todayLocal = new Date();
            const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`;
            const tomorrowLocal = new Date(Date.now() + 86400000);
            const tomorrowStr = `${tomorrowLocal.getFullYear()}-${String(tomorrowLocal.getMonth() + 1).padStart(2, "0")}-${String(tomorrowLocal.getDate()).padStart(2, "0")}`;

            const isToday    = dateStr === todayStr;
            const isTomorrow = dateStr === tomorrowStr;
            const relativeLabel = isToday ? "TODAY" : isTomorrow ? "TOMORROW" : dateObj.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

            return (
              <section key={dateStr} className="relative pl-6 sm:pl-8 border-l-2 border-slate-200/60 pb-4">
                {isToday ? (
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-amber-400 rounded-full border-4 border-[#F8FAFC] shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10" />
                ) : (
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-slate-300 rounded-full" />
                )}

                <h2 className="text-sm font-black text-slate-800 tracking-widest mb-1">{relativeLabel}</h2>
                <p className="text-xs font-bold text-slate-400 mb-4">
                  {dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>

                <div className="space-y-3">
                  {resolvedEvents
                    .sort((a, b) => ((a.start_time ?? "") > (b.start_time ?? "") ? 1 : -1))
                    .map((ev, idx) => {

                      // CANCELLED
                      if (ev.isCancelled) return (
                        <div key={idx} className="p-4 rounded-2xl border border-red-200 bg-red-50/40 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-400" />
                          <div className="ml-2">
                            <div className="flex items-center gap-2 mb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Class Cancelled</span>
                            </div>
                            <h3 className="text-base font-black text-red-400 line-through leading-tight">{ev.title}</h3>
                            <p className="text-xs font-bold text-red-400/70 mt-1">This session will not take place. Stay tuned for updates.</p>
                          </div>
                        </div>
                      );

                      // MOVED AWAY (original slot — class moved to different day)
                      if (ev.isMovedAway) return (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 relative overflow-hidden opacity-65">
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-slate-300" />
                          <div className="ml-2">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MoveRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session Moved</span>
                            </div>
                            <h3 className="text-base font-black text-slate-400 line-through leading-tight">{ev.title}</h3>
                            {ev.movedToNote && (
                              <p className="text-xs font-bold text-slate-500 mt-2 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">{ev.movedToNote}</p>
                            )}
                          </div>
                        </div>
                      );

                      // RESCHEDULED (new slot)
                      if (ev.isRescheduled) return (
                        <div key={idx} className="p-4 rounded-2xl border border-amber-200 bg-white relative overflow-hidden shadow-sm">
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400" />
                          <div className="ml-2 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Rescheduled</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <h3 className="text-lg font-black text-slate-800 leading-tight">{ev.title}</h3>
                                {ev.rescheduleNote && (
                                  <p className="text-[11px] font-bold text-amber-600/80 mt-0.5">{ev.rescheduleNote}</p>
                                )}
                              </div>
                              {ev.start_time && (
                                <p className="font-mono font-bold text-amber-700 text-sm bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {formatTime(ev.start_time)} <span className="text-amber-300 font-sans">—</span> {formatTime(ev.end_time)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );

                      // NORMAL
                      return (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-white relative overflow-hidden shadow-sm">
                          <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${ev.schedule_type === "one_time" ? "bg-purple-400" : "bg-blue-400"}`} />
                          <div className="ml-2 flex flex-col gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md self-start flex items-center gap-1 ${ev.schedule_type === "one_time" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {ev.schedule_type === "one_time" ? "Special Event" : "Routine"}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <h3 className="text-lg font-black text-slate-800 leading-tight">{ev.title}</h3>
                              {ev.start_time && (
                                <p className="font-mono font-bold text-slate-600 text-sm bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {formatTime(ev.start_time)} <span className="text-slate-300 font-sans">—</span> {formatTime(ev.end_time)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })}

          {timelineDates.length > 0 && schedules.length === 0 && (
            <div className="text-center py-20 bg-white/50 border border-dashed border-slate-200 rounded-3xl">
              <CalendarDays className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-400">Your Timeline is Clear</h3>
              <p className="text-slate-400 text-sm mt-1">There are no upcoming classes assigned to your batch.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
