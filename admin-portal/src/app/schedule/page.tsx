"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import { dispatchNativePush } from "@/lib/push";
import { CalendarDays, AlertTriangle, Users, BookOpen, Clock, Trash2, CheckSquare, Square, Power, Filter, History } from "lucide-react";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Student = { id: string; full_name: string; grade_batch: string };
type Schedule = {
  id: string; title: string; schedule_type: string; parent_schedule_id: string | null;
  override_action: string | null; day_of_week: number | null; specific_date: string | null;
  start_time: string | null; end_time: string | null; target_grades: string[]; target_students: string[];
  is_active?: boolean;
};

export default function UnifiedScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [distinctGrades, setDistinctGrades] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode
  const [activeTab, setActiveTab] = useState<"base" | "override">("base");

  // Base Form States
  const [title, setTitle] = useState("");
  const [scheduleType, setScheduleType] = useState<"recurring" | "one_time">("recurring");
  const [dayOfWeek, setDayOfWeek] = useState("1"); // Monday default
  const [specificDate, setSpecificDate] = useState("");
  const [startTime, setStartTime] = useState("14:30");
  const [endTime, setEndTime] = useState("16:30");
  
  // Targeting States
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [targetStudents, setTargetStudents] = useState<string[]>([]);

  // Override Form States
  const [parentScheduleId, setParentScheduleId] = useState("");
  const [overrideAction, setOverrideAction] = useState<"cancel" | "reschedule">("cancel");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideStart, setOverrideStart] = useState("14:30");
  const [overrideEnd, setOverrideEnd] = useState("16:30");

  // List View States
  const [listTab, setListTab] = useState<"active" | "history">("active");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterType, setFilterType] = useState("All");

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
      // Fire Push Dispatch explicitly to the targeted grades or targeted internal students
      dispatchNativePush({
        title: "📅 New Class Schedule!",
        body: `Heads up! "${payload.title}" has been added to your academic calendar. Get ready! 🚀`,
        url: "/dashboard/schedule"
      }, {
        studentIds: payload.target_students,
        gradeBatches: payload.target_grades
      });
      
      setTitle(""); setSpecificDate(""); setTargetGrades([]); setTargetStudents([]);
      fetchData();
    } else alert("Failed to save schedule.");
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentScheduleId || !overrideDate) return;

    const parent = schedules.find(s => s.id === parentScheduleId);
    if (!parent) return;

    const payload = {
      title: `${parent.title} ${overrideAction === "cancel" ? "Cancelled" : "Rescheduled"}`,
      schedule_type: "override",
      parent_schedule_id: parentScheduleId,
      override_action: overrideAction,
      specific_date: overrideDate,
      start_time: overrideAction === "reschedule" ? overrideStart : null,
      end_time: overrideAction === "reschedule" ? overrideEnd : null,
      target_grades: parent.target_grades, // inherit targets so it only blocks the true audience
      target_students: parent.target_students,
      is_active: true
    };

    const { error } = await supabase.from("schedules").insert([payload]);
    if (!error) {
      // Broadcast emergency reschedules strictly to whatever bounds the parent class established
      const overrideLabel = overrideAction === "cancel" ? "Class Cancelled" : "Class Rescheduled";
      const overrideReason = overrideAction === "cancel" ? `Your class "${parent.title}" for ${overrideDate} has been cancelled! 🛑` : `Your class "${parent.title}" has been moved to ${overrideStart} on ${overrideDate}. Stay sharp! ⚡`;
      
      dispatchNativePush({
         title: `⚠️ ${overrideLabel}`,
         body: overrideReason,
         url: "/dashboard/schedule"
      }, {
         studentIds: parent.target_students,
         gradeBatches: parent.target_grades
      });

      setParentScheduleId(""); setOverrideDate("");
      fetchData();
      setActiveTab("base");
    } else alert("Failed to save override.");
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to permanently delete this schedule?")) return;
    await supabase.from("schedules").delete().eq("id", id);
    fetchData();
  };

  const toggleScheduleStatus = async (id: string, currentStatus: boolean | undefined) => {
    const statusToSet = currentStatus === undefined ? false : !currentStatus;
    await supabase.from("schedules").update({ is_active: statusToSet }).eq("id", id);
    fetchData();
  };

  const toggleGrade = (g: string) => {
    setTargetGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };
  const toggleStudent = (sId: string) => {
    setTargetStudents(prev => prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]);
  };

  // Derived filters
  const overrideSchedules = schedules.filter(s => s.schedule_type === "override");
  
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const allBaseSchedules = schedules.filter(s => s.schedule_type !== "override");
  
  const processedSchedules = allBaseSchedules.map(base => {
    // Treat undefined is_active as true for backward compat
    const activeState = base.is_active === undefined ? true : base.is_active;
    let isPastOneTime = false;
    
    if (base.schedule_type === "one_time" && base.specific_date) {
      if (base.specific_date < todayStr) {
        isPastOneTime = true;
      }
    }
    
    return { ...base, is_active: activeState, _isPastOneTime: isPastOneTime };
  });

  const activeSchedules = processedSchedules.filter(s => s.is_active && !s._isPastOneTime);
  const historySchedules = processedSchedules.filter(s => !s.is_active || s._isPastOneTime);

  // Apply filters to the current tab array
  let displayedSchedules = listTab === "active" ? activeSchedules : historySchedules;

  if (filterGrade !== "All") {
    displayedSchedules = displayedSchedules.filter(s => 
      s.target_grades.includes(filterGrade) || (s.target_grades.length === 0 && s.target_students.length === 0) 
    );
  }

  if (filterType !== "All") {
    displayedSchedules = displayedSchedules.filter(s => s.schedule_type === filterType);
  }

  // Active base schedules used for override dropdowns
  const activeBaseOptions = processedSchedules.filter(s => s.is_active && !s._isPastOneTime);

  return (
    <main className="p-4 md:p-8 min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="mb-8 relative z-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Master Schedule</h1>
        <p className="text-slate-500 font-medium mt-1">Configure global, grade-specific, or student-specific events.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        
        {/* LEFT COLUMN: CREATION PANEL */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex rounded-xl bg-slate-200/50 p-1 backdrop-blur-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab("base")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === "base" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
            >
              New Class/Event
            </button>
            <button 
              onClick={() => setActiveTab("override")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "override" ? "bg-amber-100 text-amber-700 shadow-sm border border-amber-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"}`}
            >
              <AlertTriangle className="w-4 h-4" /> Override
            </button>
          </div>

          {activeTab === "base" ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500"/> Event Details</h2>
              <form onSubmit={handleSaveBase} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Title / Label</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Saturday Math Bootcamp" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setScheduleType("recurring")} 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${scheduleType === "recurring" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                  >
                    <p className="font-bold text-sm text-center">Weekly</p>
                  </div>
                  <div 
                    onClick={() => setScheduleType("one_time")} 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${scheduleType === "one_time" ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                  >
                    <p className="font-bold text-sm text-center">One-Time</p>
                  </div>
                </div>

                {scheduleType === "recurring" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Day of Week</label>
                    <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700">
                      {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Specific Date</label>
                    <input type="date" required value={specificDate} onChange={e => setSpecificDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 font-bold text-slate-700" />
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                    <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono focus:border-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                    <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono focus:border-blue-400" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Target Audience (Leave empty for ALL)</h3>
                  
                  <div className="max-h-32 overflow-y-auto pr-2 space-y-1 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">By Grade</p>
                    {distinctGrades.map(g => (
                      <div key={g} onClick={() => toggleGrade(g)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group">
                        {targetGrades.includes(g) ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />}
                        <span className="text-sm font-bold text-slate-600">{g}</span>
                      </div>
                    ))}
                  </div>

                  <div className="max-h-40 overflow-y-auto pr-2 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">By Individual Student</p>
                    {students.map(s => (
                      <div key={s.id} onClick={() => toggleStudent(s.id)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group">
                        {targetStudents.includes(s.id) ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />}
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-600 line-clamp-1">{s.full_name}</span>
                           <span className="text-[10px] text-slate-400">{s.grade_batch}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all active:scale-[0.98]">
                  Publish Schedule
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
              <h2 className="text-lg font-black text-amber-700 mb-6 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Emergency Override</h2>
              
              <form onSubmit={handleSaveOverride} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-amber-700/80 uppercase tracking-widest mb-2">Select Affected Class</label>
                  <select required value={parentScheduleId} onChange={e => setParentScheduleId(e.target.value)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl outline-none focus:border-amber-400 font-bold text-amber-900">
                    <option value="" disabled>-- Choose a base class --</option>
                    {activeBaseOptions.map(bs => (
                      <option key={bs.id} value={bs.id}>{bs.title} ({DAYS_OF_WEEK[bs.day_of_week || 0]})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700/80 uppercase tracking-widest mb-2">Override Date</label>
                  <input type="date" required value={overrideDate} onChange={e => setOverrideDate(e.target.value)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl outline-none font-bold text-amber-900 focus:border-amber-400" />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div 
                    onClick={() => setOverrideAction("cancel")} 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${overrideAction === "cancel" ? "border-red-400 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-600 hover:border-amber-200"}`}
                  >
                    <p className="font-bold text-sm text-center">Cancel Class</p>
                  </div>
                  <div 
                    onClick={() => setOverrideAction("reschedule")} 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${overrideAction === "reschedule" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-amber-100 bg-amber-50 text-amber-600 hover:border-amber-200"}`}
                  >
                    <p className="font-bold text-sm text-center">Change Time</p>
                  </div>
                </div>

                {overrideAction === "reschedule" && (
                  <div className="flex gap-3 pt-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-amber-700/80 uppercase tracking-widest mb-2">New Start</label>
                      <input type="time" required value={overrideStart} onChange={e => setOverrideStart(e.target.value)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl outline-none font-mono focus:border-amber-400 text-amber-900" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-amber-700/80 uppercase tracking-widest mb-2">New End</label>
                      <input type="time" required value={overrideEnd} onChange={e => setOverrideEnd(e.target.value)} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl outline-none font-mono focus:border-amber-400 text-amber-900" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading || activeBaseOptions.length === 0} className="w-full mt-4 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-[0_4px_14px_0_rgba(245,158,11,0.3)] transition-all active:scale-[0.98] disabled:opacity-50">
                  Deploy Override
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIST VIEW */}
        <div className="xl:col-span-8 space-y-4">
           {/* Section Header & Filters */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
             
             {/* Tabs */}
             <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 w-full md:w-auto">
                <button 
                  onClick={() => setListTab("active")}
                  className={`flex-1 md:w-32 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${listTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <CalendarDays className="w-4 h-4"/> Active
                </button>
                <button 
                  onClick={() => setListTab("history")}
                  className={`flex-1 md:w-32 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${listTab === "history" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <History className="w-4 h-4"/> History
                </button>
             </div>

             {/* Filters */}
             <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar">
               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-10 shrink-0">
                 <Filter className="w-3.5 h-3.5 text-slate-400 ml-1 mr-2" />
                 <select 
                   value={filterGrade} 
                   onChange={(e) => setFilterGrade(e.target.value)}
                   className="bg-transparent text-sm font-bold text-slate-600 outline-none w-24 shrink-0"
                 >
                   <option value="All">All Grades</option>
                   {distinctGrades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                 </select>
               </div>
               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-10 shrink-0">
                 <select 
                   value={filterType} 
                   onChange={(e) => setFilterType(e.target.value)}
                   className="bg-transparent text-sm font-bold text-slate-600 outline-none pr-1"
                 >
                   <option value="All">All Types</option>
                   <option value="recurring">Weekly</option>
                   <option value="one_time">One-Time</option>
                 </select>
               </div>
             </div>
           </div>

           {isLoading && <div className="text-slate-400 text-sm font-bold text-center mt-10">Syncing Master Schedule...</div>}
           
           {!isLoading && displayedSchedules.length === 0 && (
             <div className="bg-white/50 border border-dashed border-slate-300 rounded-3xl p-12 text-center">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-400">No Schedules Found</h3>
                <p className="text-slate-400 text-sm">
                  {listTab === "active" ? "Create your first class setting to the left." : "No historical or paused schedules right now."}
                </p>
             </div>
           )}

           {displayedSchedules.map(base => {
             const relatedOverrides = overrideSchedules.filter(o => o.parent_schedule_id === base.id);
             // Safety check for is_active which we injected dynamically via map
             const activeState = (base as any).is_active;

             return (
               <div key={base.id} className={`bg-white rounded-[2rem] shadow-sm border ${activeState ? 'border-slate-200 hover:border-blue-200' : 'border-slate-100 opacity-70 hover:opacity-100'} overflow-hidden relative group transition-all`}>
                  {/* Status Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${!activeState ? 'bg-slate-300' : base.schedule_type === 'recurring' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                  
                  <div className="p-6 md:p-8 ml-2">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${!activeState ? 'bg-slate-100 text-slate-500' : base.schedule_type === 'recurring' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {base.schedule_type === 'recurring' ? 'Weekly Routine' : 'One-Time Event'}
                          </span>
                          {!activeState && (
                             <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 flex items-center gap-1">
                               <Power className="w-3 h-3" /> Inactive
                             </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 line-clamp-2">{base.title}</h3>
                        <p className={`font-bold text-sm flex items-center gap-2 mt-2 ${!activeState ? 'text-slate-400' : 'text-slate-600'}`}>
                          <Clock className="w-4 h-4 text-slate-400" />
                          {base.schedule_type === 'recurring' ? `Every ${DAYS_OF_WEEK[base.day_of_week || 0]}` : new Date(base.specific_date || '').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          <span className="text-slate-300">|</span> 
                          <span className={`font-mono px-2 py-0.5 rounded text-xs ${!activeState ? 'text-slate-500 bg-slate-50' : 'text-blue-600 bg-blue-50'}`}>
                            {base.start_time} — {base.end_time}
                          </span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Toggle Active Status Button */}
                        <button 
                          onClick={() => toggleScheduleStatus(base.id, activeState)} 
                          className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold transition-colors shadow-sm border ${activeState ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-red-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                          title={activeState ? "Deactivate Schedule" : "Reactivate Schedule"}
                        >
                          <Power className="w-3.5 h-3.5" /> 
                          {activeState ? "Turn Off" : "Turn On"}
                        </button>

                        <button onClick={() => handleDelete(base.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-slate-200 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                      {base.target_grades.length === 0 && base.target_students.length === 0 ? (
                        <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${!activeState ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>🌍 Global (All Students)</span>
                      ) : (
                        <>
                          {base.target_grades.map(g => <span key={g} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{g}</span>)}
                          {base.target_students.length > 0 && <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">+{base.target_students.length} Individual Students</span>}
                        </>
                      )}
                    </div>

                    {/* OVERRIDES SECTION */}
                    {relatedOverrides.length > 0 && (
                      <div className={`mt-6 space-y-2 ${!activeState ? 'opacity-50' : ''}`}>
                        {relatedOverrides.map(ov => (
                          <div key={ov.id} className={`p-4 rounded-xl border flex justify-between items-center ${ov.override_action === 'cancel' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                            <div>
                               <p className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${ov.override_action === 'cancel' ? 'text-red-500' : 'text-amber-500'}`}>
                                 <AlertTriangle className="w-3 h-3" /> 
                                 {ov.override_action === 'cancel' ? 'Class Cancelled' : 'Time Rescheduled'}
                               </p>
                               <p className="font-bold text-slate-700 text-sm mt-1">{new Date(ov.specific_date || '').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                               {ov.override_action === 'reschedule' && (
                                 <p className="font-mono text-xs text-amber-700/70 mt-0.5">{ov.start_time} — {ov.end_time}</p>
                               )}
                            </div>
                            <button onClick={() => handleDelete(ov.id)} className="text-slate-400 hover:text-red-500 text-xl font-light p-2 transition-colors">×</button>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
               </div>
             )
           })}

        </div>
      </div>
    </main>
  );
}