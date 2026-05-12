"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import { dispatchNativePush } from "@/lib/push";
import { CalendarDays, Users, Clock, Trash2, CheckSquare, Square, Power, Plus, X, AlertCircle } from "lucide-react";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Student = { id: string; full_name: string; grade_batch: string };
type Schedule = {
  id: string; title: string; schedule_type: string; parent_schedule_id: string | null;
  override_action: string | null; day_of_week: number | null; specific_date: string | null;
  start_time: string | null; end_time: string | null; target_grades: string[]; target_students: string[];
  is_active?: boolean;
};

export default function ClassSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [distinctGrades, setDistinctGrades] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [scheduleType, setScheduleType] = useState<"recurring" | "one_time">("recurring");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("14:30");
  const [endTime, setEndTime] = useState("16:30");
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [targetStudents, setTargetStudents] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [scheduleRes, studentRes] = await Promise.all([
      supabase.from("schedules").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("id, full_name, grade_batch").eq("is_active", true)
    ]);
    
    if (scheduleRes.data) setSchedules(scheduleRes.data);
    
    if (studentRes.data) {
      setStudents(studentRes.data);
      const grades = Array.from(new Set(studentRes.data.map(s => s.grade_batch))).filter(Boolean) as string[];
      setDistinctGrades(grades);
    }
    
    setIsLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setScheduleType("recurring");
    setDayOfWeek("1");
    setSpecificDate("");
    setStartTime("14:30");
    setEndTime("16:30");
    setTargetGrades([]);
    setTargetStudents([]);
  };

  const handleOpenDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleSaveBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleType === "one_time" && !specificDate) return;

    const payload = {
      title,
      schedule_type: scheduleType,
      day_of_week: scheduleType === "recurring" ? parseInt(dayOfWeek) : null,
      specific_date: scheduleType === "one_time" ? specificDate : null,
      start_time: startTime,
      end_time: endTime,
      target_grades: targetGrades,
      target_students: targetStudents,
      is_active: true
    };

    const { error } = await supabase.from("schedules").insert([payload]);
    if (!error) {
      dispatchNativePush({
        title: "New Class Schedule",
        body: `"${payload.title}" has been added to your schedule.`,
        url: "/dashboard/schedule"
      }, {
        studentIds: payload.target_students,
        gradeBatches: payload.target_grades
      });
      
      setIsDrawerOpen(false);
      fetchData();
    } else alert("Failed to save schedule.");
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this schedule?")) return;
    await supabase.from("schedules").delete().eq("id", id);
    if (selectedSchedule?.id === id) setIsDetailsOpen(false);
    fetchData();
  };

  const toggleScheduleStatus = async (id: string, currentStatus: boolean | undefined) => {
    const statusToSet = currentStatus === undefined ? false : !currentStatus;
    await supabase.from("schedules").update({ is_active: statusToSet }).eq("id", id);
    if (selectedSchedule?.id === id) {
      setSelectedSchedule(prev => prev ? { ...prev, is_active: statusToSet } : null);
    }
    fetchData();
  };

  const toggleGrade = (g: string) => setTargetGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleStudent = (sId: string) => setTargetStudents(prev => prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]);

  const openDetails = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailsOpen(true);
  };

  // Data Processing
  const todayStr = new Date().toISOString().split("T")[0];
  const allBaseSchedules = schedules.filter(s => s.schedule_type !== "override");
  
  const processedSchedules = allBaseSchedules.map(base => {
    const activeState = base.is_active === undefined ? true : base.is_active;
    let isPastOneTime = false;
    if (base.schedule_type === "one_time" && base.specific_date && base.specific_date < todayStr) {
      isPastOneTime = true;
    }
    return { ...base, is_active: activeState, _isPastOneTime: isPastOneTime };
  });

  const activeSchedules = processedSchedules.filter(s => s.is_active && !s._isPastOneTime);
  const recurringSchedules = activeSchedules.filter(s => s.schedule_type === 'recurring');
  const oneTimeSchedules = activeSchedules.filter(s => s.schedule_type === 'one_time');

  const groupedRecurring: Record<number, Schedule[]> = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  recurringSchedules.forEach(s => {
    if (s.day_of_week !== null) groupedRecurring[s.day_of_week].push(s as Schedule);
  });
  Object.keys(groupedRecurring).forEach(day => {
    groupedRecurring[parseInt(day)].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  });

  // Reorder days to start with Monday (1) through Sunday (0)
  const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Class Agenda</h1>
            <p className="text-slate-500 text-sm mt-1">Manage weekly and one-time schedules</p>
          </div>
          <button 
            onClick={handleOpenDrawer}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Class
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading schedule...</div>
        ) : (
          <>
            {/* Recurring Schedule Grid */}
            <div>
              <h2 className="text-xl font-medium text-slate-900 mb-6 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-600" /> Weekly Routine
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {DISPLAY_DAYS.map((dayIndex) => {
                  const daySchedules = groupedRecurring[dayIndex];
                  if (daySchedules.length === 0) return null;
                  return (
                    <div key={dayIndex} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">{DAYS_OF_WEEK[dayIndex]}</h3>
                        <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100">{daySchedules.length}</span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-3">
                        {daySchedules.map(schedule => (
                          <div 
                            key={schedule.id}
                            onClick={() => openDetails(schedule)}
                            className="group p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 cursor-pointer transition-colors"
                          >
                            <h4 className="font-medium text-slate-900 text-sm mb-1">{schedule.title}</h4>
                            <div className="flex items-center text-xs text-slate-500 font-mono">
                              <Clock className="w-3 h-3 mr-1.5 opacity-70" />
                              {schedule.start_time} - {schedule.end_time}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {recurringSchedules.length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  No recurring classes scheduled.
                </div>
              )}
            </div>

            {/* One-Time Events */}
            {oneTimeSchedules.length > 0 && (
              <div>
                <h2 className="text-xl font-medium text-slate-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" /> Upcoming One-Time Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {oneTimeSchedules.map(schedule => (
                    <div 
                      key={schedule.id}
                      onClick={() => openDetails(schedule)}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-200 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                        {new Date(schedule.specific_date || "").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h4 className="font-medium text-slate-900 mb-2">{schedule.title}</h4>
                      <div className="flex items-center text-xs text-slate-500 font-mono">
                        <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer for Add/Edit Class */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Add New Class</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="schedule-form" onSubmit={handleSaveBase} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Class Title</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Advanced English" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors text-slate-900 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setScheduleType("recurring")} 
                    className={`px-4 py-3 rounded-lg border text-sm text-center cursor-pointer transition-colors ${scheduleType === "recurring" ? "border-slate-900 bg-slate-900 text-white font-medium" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    Weekly Recurring
                  </div>
                  <div 
                    onClick={() => setScheduleType("one_time")} 
                    className={`px-4 py-3 rounded-lg border text-sm text-center cursor-pointer transition-colors ${scheduleType === "one_time" ? "border-slate-900 bg-slate-900 text-white font-medium" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    One-Time Date
                  </div>
                </div>

                {scheduleType === "recurring" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Day of Week</label>
                    <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors text-slate-900 text-sm">
                      {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Specific Date</label>
                    <input type="date" required value={specificDate} onChange={e => setSpecificDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors text-slate-900 text-sm" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                    <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono text-slate-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                    <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono text-slate-900 text-sm" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Target Audience (Optional)</h3>
                  <p className="text-xs text-slate-500 mb-4">Leave unselected to apply globally to all students.</p>
                  
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Grade Batch</div>
                    <div className="space-y-1">
                      {distinctGrades.map(g => (
                        <div key={g} onClick={() => toggleGrade(g)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                          {targetGrades.includes(g) ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                          <span className="text-sm text-slate-700">{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Individual Student</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {students.map(s => (
                        <div key={s.id} onClick={() => toggleStudent(s.id)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                          {targetStudents.includes(s.id) ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                          <div className="flex flex-col">
                             <span className="text-sm text-slate-700">{s.full_name}</span>
                             <span className="text-xs text-slate-400">{s.grade_batch}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button form="schedule-form" type="submit" disabled={isLoading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all text-sm">
                Save Class Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm ${selectedSchedule.schedule_type === 'recurring' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedSchedule.schedule_type === 'recurring' ? 'Weekly' : 'One-Time'}
                  </span>
                  {!selectedSchedule.is_active && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-red-100 text-red-700 flex items-center gap-1">
                      <Power className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedSchedule.title}</h2>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">
                    {selectedSchedule.schedule_type === 'recurring' 
                      ? `Every ${DAYS_OF_WEEK[selectedSchedule.day_of_week || 0]}` 
                      : new Date(selectedSchedule.specific_date || '').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-mono">{selectedSchedule.start_time} - {selectedSchedule.end_time}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" /> Targeted Audience
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  {selectedSchedule.target_grades.length === 0 && selectedSchedule.target_students.length === 0 ? (
                    <p className="text-sm text-slate-600">Global (Applies to all students)</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedSchedule.target_grades.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Grades</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedSchedule.target_grades.map(g => <span key={g} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md">{g}</span>)}
                          </div>
                        </div>
                      )}
                      {selectedSchedule.target_students.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Students</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedSchedule.target_students.map(sid => {
                              const student = students.find(s => s.id === sid);
                              return <span key={sid} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md">{student ? student.full_name : sid}</span>
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => toggleScheduleStatus(selectedSchedule.id, selectedSchedule.is_active)}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors border ${selectedSchedule.is_active ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}
              >
                {selectedSchedule.is_active ? 'Deactivate Class' : 'Reactivate Class'}
              </button>
              
              <button 
                onClick={() => handleDelete(selectedSchedule.id)}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}