"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SNT from "@/components/StudentNameTransformer";
import QRCode from "qrcode";
import { League_Spartan, Prata } from "next/font/google";

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});
const prata = Prata({ subsets: ["latin"], weight: ["400"] });

export default function StudentsHub() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "dropped" | "all"
  >("active");

  const [promotionModal, setPromotionModal] = useState<any | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [promotedStudent, setPromotedStudent] = useState<any | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState("");

  const [xpModal, setXpModal] = useState<{ id: string; name: string } | null>(null);
  const [xpAmount, setXpAmount] = useState<number | "">("");
  const [xpNote, setXpNote] = useState("");
  const [isAwardingXp, setIsAwardingXp] = useState(false);

  // New state to track which row's dropdown is currently open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const fetchStudents = async () => {
    setIsLoading(true);
    let query = supabase
      .from("students")
      .select("*")
      .order("full_name", { ascending: true });

    if (statusFilter === "active") query = query.eq("is_active", true);
    if (statusFilter === "dropped") query = query.eq("is_active", false);

    const { data, error } = await query;
    if (error) console.error("Error fetching students:", error);
    if (data) setStudents(data);

    setIsLoading(false);
  };

  const toggleStudentStatus = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    const action = currentStatus ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;

    const { error } = await supabase
      .from("students")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (!error) fetchStudents();
  };

  const requestReprint = async (studentId: string, name: string) => {
    if (!confirm(`Send ${name}'s ID card to the Print Hub?`)) return;

    const { data: existing } = await supabase
      .from("card_print_queue")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "pending")
      .single();

    if (existing) {
      alert("This student is already in the print queue!");
      return;
    }

    const { error } = await supabase
      .from("card_print_queue")
      .insert([{ student_id: studentId }]);
    if (!error) alert(`✅ Added to Print Hub Queue!`);
  };

  const handlePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from("students")
        .update({ grade_batch: newGrade })
        .eq("id", promotionModal.id);

      if (updateError) throw updateError;

      const { data: existing } = await supabase
        .from("card_print_queue")
        .select("id")
        .eq("student_id", promotionModal.id)
        .eq("status", "pending")
        .single();

      if (!existing) {
        await supabase
          .from("card_print_queue")
          .insert([{ student_id: promotionModal.id }]);
      }

      const qrImage = await QRCode.toDataURL(promotionModal.qr_code, {
        margin: 0,
        width: 200,
      });
      setPreviewQrUrl(qrImage);

      setPromotedStudent({
        ...promotionModal,
        grade_batch: newGrade,
      });

      setPromotionModal(null);
      fetchStudents();
    } catch (err) {
      console.error("Promotion failed:", err);
      alert("Failed to update student.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAwardXp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xpModal || !xpAmount) return;
    
    setIsAwardingXp(true);
    try {
      const { error } = await supabase.from("xp_logs").insert({
        student_id: xpModal.id,
        amount: Number(xpAmount),
        reason: "Admin Reward",
        note: xpNote
      });

      if (error) throw error;
      
      alert(`Successfully awarded ${xpAmount} XP!`);
      setXpModal(null);
      setXpAmount("");
      setXpNote("");
      fetchStudents();
    } catch (err) {
      console.error("Failed to award XP:", err);
      alert("Error awarding XP. Check console.");
    } finally {
      setIsAwardingXp(false);
    }
  };



  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.qr_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.grade_batch.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      
      {/* Invisible overlay to close dropdown when clicking outside */}
      {openMenuId && (
        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
      )}


      {/* MODAL 1: THE INPUT FORM */}
      {promotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Yearly Promotion
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  {SNT(promotionModal.full_name)}
                </p>
              </div>
              <div className="text-4xl">🎲</div>
            </div>

            <form onSubmit={handlePromotion} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  New Grade / Batch
                </label>
                <input
                  type="text"
                  required
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all text-lg font-bold text-slate-800"
                  placeholder="e.g. 11"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 font-medium text-center">
                  Saving will queue this student for printing.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotionModal(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isUpdating || newGrade === promotionModal.grade_batch
                  }
                  className="flex-1 py-3 px-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/30 transition-all disabled:opacity-50"
                >
                  {isUpdating ? "Promoting..." : "Promote & Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: AWARD XP */}
      {xpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Award XP
                </h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  {xpModal.name}
                </p>
              </div>
              <div className="text-4xl">🌟</div>
            </div>

            <form onSubmit={handleAwardXp} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  required
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-lg font-bold text-slate-800"
                  placeholder="e.g. 50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Note
                </label>
                <input
                  type="text"
                  required
                  value={xpNote}
                  onChange={(e) => setXpNote(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all text-lg font-bold text-slate-800"
                  placeholder="e.g. Excellent participation"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setXpModal(null);
                    setXpAmount("");
                    setXpNote("");
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAwardingXp || !xpAmount || !xpNote}
                  className="flex-1 py-3 px-4 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
                >
                  {isAwardingXp ? "Awarding..." : "Award XP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THE GACHA REVEAL */}
      {promotedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-5xl w-full border border-slate-200 my-4 animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-amber-50 border border-amber-100 mb-2 md:mb-4 animate-bounce">
                <span className="text-2xl md:text-3xl">🎉</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800">
                Promoted to Grade {promotedStudent.grade_batch}!
              </h2>
              <p className="text-amber-600 font-bold mt-2 text-lg">
                Student queued for ID reprint.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-center mb-8 opacity-90 pointer-events-none">
              {/* --- FRONT CARD PREVIEW --- */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-slate-400 font-bold tracking-widest text-sm">
                  FRONT UPDATED
                </span>
                <div
                  className="relative bg-white overflow-hidden shadow-2xl rounded-sm"
                  style={{ width: "324px", height: "204px" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/id-front.jpg"
                    alt="Front"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                  <div className="absolute z-10 top-[42px] left-[190px] w-[110px]">
                    <p
                      className={`text-[13px] text-black m-0 leading-[1.15] font-extrabold tracking-tight break-words ${leagueSpartan.className}`}
                    >
                      {SNT(promotedStudent.full_name)}
                    </p>
                  </div>
                  <div className="absolute z-10 top-[80px] left-[190px]">
                    <p
                      className={`text-sm text-black m-0 leading-none font-extrabold tracking-tight ${leagueSpartan.className}`}
                    >
                      {promotedStudent.grade_batch}
                    </p>
                  </div>
                  <div className="absolute z-10 bottom-[35px] left-[95px]">
                    <p
                      className={`text-sm tracking-[0.13em] text-black m-0 leading-none ${prata.className}`}
                    >
                      {promotedStudent.qr_code}
                    </p>
                  </div>
                  {previewQrUrl && (
                    <div className="absolute z-10 top-[30px] left-[30px] w-[80px] h-[80px] bg-white p-1 rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewQrUrl}
                        alt="QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* --- BACK CARD PREVIEW --- */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-amber-600 font-bold tracking-widest text-sm">
                  NEW CARD BACK
                </span>
                <div
                  className="relative bg-white overflow-hidden shadow-2xl rounded-sm transform transition-transform hover:scale-105"
                  style={{ width: "324px", height: "204px" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/id-back-1.jpg"
                    alt="Back"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex w-full justify-center max-w-md">
              <button
                onClick={() => {
                  setPromotedStudent(null);
                  setPreviewQrUrl("");
                }}
                className="w-full py-4 px-6 font-black text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all shadow-lg hover:-translate-y-1"
              >
                Awesome! Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THE MAIN DASHBOARD GRID */}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-slate-50 text-slate-800 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-slate-200">
                🎓
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Students Hub
              </h1>
            </div>
            <p className="text-slate-500 font-medium">
              Manage enrollments, track dropouts, and request ID reprints.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <input
              type="text"
              placeholder="Search names, IDs, or grades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 p-3 rounded-xl border border-slate-200 outline-none focus:border-amber-500 shadow-sm font-medium"
            />
          </div>
        </header>

        <div className="flex gap-2 mb-6 bg-slate-200/50 p-1.5 rounded-xl w-fit overflow-x-auto max-w-full custom-scrollbar">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${statusFilter === "active" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Active Students
          </button>
          <button
            onClick={() => setStatusFilter("dropped")}
            className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${statusFilter === "dropped" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Dropped Out
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 md:px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${statusFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            All Records
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-bold animate-pulse">
                Loading Roster...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="text-5xl mb-4 opacity-50 grayscale">👻</div>
              <h3 className="text-xl font-black text-slate-800">
                No students found
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar pb-32">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                    <th className="p-4 font-bold">Student Details</th>
                    <th className="p-4 font-bold">Short ID</th>
                    <th className="p-4 font-bold">Grade</th>
                    <th className="p-4 font-bold">Total XP</th>
                    <th className="p-4 font-bold">Sessions</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={`transition-colors hover:bg-slate-50 ${!student.is_active ? "bg-slate-50/50" : ""}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 ${student.is_active ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                          >
                            {SNT(student.full_name)
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {SNT(student.full_name)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Enrolled: {student.enrollment_date}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* ADDED whitespace-nowrap right here to prevent wrapping! */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-mono text-xs font-bold border border-slate-200">
                          {student.qr_code}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-slate-600">
                        {student.grade_batch}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg shadow-sm">
                          {student.total_xp || 0} XP
                        </span>
                      </td>

                      <td className="p-4">
                        {student.sessions_attended >= 8 ? (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg flex items-center justify-between w-28 md:w-32 shadow-sm">
                            <span className="text-xs font-black tracking-wider uppercase">
                              Fee Due
                            </span>
                            <span className="font-mono font-bold text-sm text-red-500">
                              {student.sessions_attended}/8
                            </span>
                          </div>
                        ) : (
                          <div className="w-28 md:w-32">
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                              <span className="text-slate-500">Cycle</span>
                              <span className="text-slate-700">
                                {student.sessions_attended || 0}/8
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div
                                className="h-full bg-slate-800 rounded-full transition-all duration-500"
                                style={{
                                  width: `${((student.sessions_attended || 0) / 8) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>


                      <td className="p-4">
                        <div className="flex justify-end relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 active:scale-95 shadow-sm"
                          >
                            ⚙️ Options
                          </button>

                          {openMenuId === student.id && (
                            <div className="absolute right-0 top-full mt-2 z-40 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-col gap-1 w-48 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                              {student.is_active && (
                                <>
                                  <button
                                    onClick={() => {
                                      setPromotionModal(student);
                                      setNewGrade(student.grade_batch);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-3"
                                  >
                                    <span className="text-base">🎲</span> Promote
                                  </button>

                                  <button
                                    onClick={() => {
                                      setXpModal({ id: student.id, name: SNT(student.full_name) });
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-3"
                                  >
                                    <span className="text-base">🌟</span> Award XP
                                  </button>

                                  <button
                                    onClick={() => {
                                      requestReprint(student.id, SNT(student.full_name));
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-3"
                                  >
                                    <span className="text-base">🖨️</span> Reprint
                                  </button>
                                  <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                </>
                              )}

                              <button
                                onClick={() => {
                                  toggleStudentStatus(student.id, student.is_active, SNT(student.full_name));
                                  setOpenMenuId(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 font-bold text-xs rounded-xl transition-colors flex items-center gap-3 ${student.is_active ? "hover:bg-red-50 text-red-600" : "hover:bg-emerald-50 text-emerald-600"}`}
                              >
                                <span className="text-base">{student.is_active ? "🛑" : "✅"}</span> 
                                {student.is_active ? "Deactivate" : "Reactivate"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}