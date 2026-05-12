"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dispatchNativePush } from "@/lib/push";
import SNT from "@/components/StudentNameTransformer";

export default function AdminLedger() {
  const [dueStudents, setDueStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Financial Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  // Search filter for the master ledger
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [amount, setAmount] = useState("2500");
  const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Fee Modal State
  const [customFeeModal, setCustomFeeModal] = useState(false);
  const [customFeeStudentId, setCustomFeeStudentId] = useState("");
  const [customFeeLabel, setCustomFeeLabel] = useState("Admission Fee");
  const [customFeeAmount, setCustomFeeAmount] = useState("500");
  const [isCustomProcessing, setIsCustomProcessing] = useState(false);
  const [customStudentSearch, setCustomStudentSearch] = useState("");

  // View Toggle for Mobile/Tablet
  const [activeTab, setActiveTab] = useState<"action" | "history">("action");

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    setIsLoading(true);

    const [dueRes, allStudentsRes, ledgerRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, grade_batch, qr_code, sessions_attended")
        .eq("is_active", true)
        .gte("sessions_attended", 8)
        .order("full_name", { ascending: true }),
      supabase
        .from("students")
        .select("id, full_name, grade_batch, qr_code")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("payments")
        .select(`id, amount, paid_at, notes, payment_month, student:students ( full_name, grade_batch, qr_code )`)
        .order("paid_at", { ascending: false }),
    ]);

    if (dueRes.data) setDueStudents(dueRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);

    if (ledgerRes.data) {
      setLedger(ledgerRes.data);
      const currentMonthString = new Date().toISOString().slice(0, 7);
      let total = 0;
      let monthly = 0;
      ledgerRes.data.forEach((payment) => {
        const amt = Number(payment.amount) || 0;
        total += amt;
        if (payment.paid_at.startsWith(currentMonthString)) monthly += amt;
      });
      setTotalRevenue(total);
      setMonthlyRevenue(monthly);
    }

    setIsLoading(false);
  };

  const processCustomFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeeStudentId) return;
    setIsCustomProcessing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const student = allStudents.find(s => s.id === customFeeStudentId);

      const { data: generatedPayment, error: insertError } = await supabase
        .from("payments")
        .insert([{
          student_id: customFeeStudentId,
          amount: parseFloat(customFeeAmount),
          payment_month: today,
          notes: customFeeLabel || "Custom Fee",
        }])
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (student) {
        dispatchNativePush({
          title: "💳 Payment Received!",
          body: `Rs ${parseFloat(customFeeAmount).toLocaleString()} collected for "${customFeeLabel}". Tap to view your receipt! 🧾`,
          url: generatedPayment ? `/dashboard/ledger?receipt=${generatedPayment.id}` : "/dashboard/ledger"
        }, { studentIds: [customFeeStudentId] });
      }

      setCustomFeeModal(false);
      setCustomFeeStudentId("");
      setCustomFeeLabel("Admission Fee");
      setCustomFeeAmount("500");
      setCustomStudentSearch("");
      fetchFinancials();
    } catch (err: any) {
      console.error("Custom fee failed:", err);
      alert("Failed to process. Check console.");
    } finally {
      setIsCustomProcessing(false);
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data: generatedPayment, error: insertError } = await supabase.from("payments").insert([{
        student_id: paymentModal.id,
        amount: parseFloat(amount),
        payment_month: paymentMonth,
        notes: notes || "Session Payment"
      }]).select("id").single();

      if (insertError) throw insertError;

      const updatedSessions = Math.max(0, paymentModal.sessions_attended - 8);

      const { error: updateError } = await supabase
        .from("students")
        .update({ sessions_attended: updatedSessions })
        .eq("id", paymentModal.id);

      if (updateError) throw updateError;

      dispatchNativePush({
        title: "💳 Payment Processed!",
        body: `We just secured your payment of Rs ${parseFloat(amount).toLocaleString()}. Tap here to view the official receipt! ✨`,
        url: generatedPayment ? `/dashboard/ledger?receipt=${generatedPayment.id}` : "/dashboard/ledger"
      }, { studentIds: [paymentModal.id] });

      setPaymentModal(null);
      setNotes("");
      setPaymentMonth(new Date().toISOString().split("T")[0]);
      fetchFinancials();

    } catch (error: any) {
      console.error("Payment failed:", error);
      alert("Failed to process payment. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLedger = ledger.filter(payment => {
    const studentName = (payment.student?.full_name || "").toLowerCase();
    const studentId = payment.student?.qr_code?.toLowerCase() || "";
    const noteText = payment.notes?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    
    return studentName.includes(search) || studentId.includes(search) || noteText.includes(search);
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">
      
      {/* --- CUSTOM FEE MODAL --- */}
      {customFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-navy-900">Add Custom Fee</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">Log a one-off charge for any student.</p>
              </div>
            </div>

            <form onSubmit={processCustomFee} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Select Student</label>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={customStudentSearch}
                  onChange={e => setCustomStudentSearch(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-gold-500 font-medium mb-2"
                />
                <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {allStudents
                    .filter(s =>
                      (s.full_name?.toLowerCase() || "").includes(customStudentSearch.toLowerCase()) ||
                      (s.qr_code?.toLowerCase() || "").includes(customStudentSearch.toLowerCase())
                    )
                    .map(s => (
                      <div
                        key={s.id}
                        onClick={() => setCustomFeeStudentId(s.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                          customFeeStudentId === s.id
                            ? "bg-navy-50 border-navy-400 shadow-sm"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-navy-900 text-sm">{SNT(s.full_name)}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.qr_code} · Grade {s.grade_batch}</p>
                        </div>
                        {customFeeStudentId === s.id && <span className="text-navy-600 font-black text-lg">✓</span>}
                      </div>
                    ))
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Fee Label / Description</label>
                <input
                  type="text"
                  required
                  value={customFeeLabel}
                  onChange={e => setCustomFeeLabel(e.target.value)}
                  placeholder="e.g. Admission Fee, Material Kit..."
                  className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-gold-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Amount (LKR)</label>
                <input
                  type="number"
                  required
                  value={customFeeAmount}
                  onChange={e => setCustomFeeAmount(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-navy-600 focus:ring-4 focus:ring-navy-600/20 outline-none transition-all text-xl font-black text-navy-900 font-mono"
                />
              </div>

              {!customFeeStudentId && (
                <p className="text-xs font-bold text-gold-600 bg-gold-50 border border-gold-100 px-3 py-2 rounded-lg">⚠️ Please select a student above to proceed.</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setCustomFeeModal(false); setCustomFeeStudentId(""); setCustomStudentSearch(""); }} className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCustomProcessing || !customFeeStudentId} className="flex-1 py-3 px-4 bg-navy-900 text-white font-black rounded-xl hover:bg-navy-800 shadow-lg shadow-navy-900/30 transition-all disabled:opacity-40">
                  {isCustomProcessing ? "Processing..." : "Collect & Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-navy-900">Log Payment</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">{SNT(paymentModal.full_name)} • Grade {paymentModal.grade_batch}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center">
              <span className="text-slate-600 font-bold text-sm">Sessions Attended</span>
              <span className="text-xl font-black text-navy-900 font-mono">{paymentModal.sessions_attended}</span>
            </div>

            <form onSubmit={processPayment} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Amount (LKR)</label>
                <input 
                  type="number" 
                  required 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-navy-600 focus:ring-4 focus:ring-navy-600/20 outline-none transition-all text-xl font-black text-navy-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Payment Month</label>
                <input 
                  type="date" 
                  required 
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-navy-600 focus:ring-4 focus:ring-navy-600/20 outline-none transition-all font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy-900 mb-2">Notes</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-navy-600 focus:ring-4 focus:ring-navy-600/20 outline-none transition-all font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-navy-900 text-white font-black rounded-xl hover:bg-navy-800 shadow-lg shadow-navy-900/30 transition-all disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-navy-900 p-6 md:p-8 rounded-3xl shadow-sm border border-navy-800 text-white">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Ledger</h1>
              <p className="text-navy-200 font-medium mt-1">Manage session billing, track revenue, and view history.</p>
            </div>
          </div>
          <div className="flex gap-3 w-full xl:w-auto">
            <button
              onClick={() => { setCustomFeeModal(true); setCustomFeeStudentId(""); setCustomStudentSearch(""); }}
              className="flex-1 xl:flex-none px-5 py-3 bg-gold-500 text-navy-900 font-black rounded-xl hover:bg-gold-400 transition-all shadow-md"
            >
              + Add Custom Fee
            </button>
            <button onClick={fetchFinancials} className="px-5 py-3 bg-navy-800 text-white font-bold rounded-xl hover:bg-navy-700 transition-colors border border-navy-700">
              ↻ Sync
            </button>
          </div>
        </header>

        {/* FINANCIAL ANALYTICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">This Month's Revenue</span>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-black text-navy-900 font-mono tracking-tight">Rs {monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">All-Time Revenue</span>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-black text-navy-900 font-mono tracking-tight">Rs {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pending Collections</span>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-black text-navy-900 font-mono tracking-tight">{dueStudents.length} Students</p>
            </div>
          </div>
        </div>

        {/* MOBILE/TABLET TAB TOGGLES */}
        <div className="xl:hidden flex bg-slate-200 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab("action")} 
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'action' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Action Required ({dueStudents.length})
          </button>
          <button 
            onClick={() => setActiveTab("history")} 
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Transaction History
          </button>
        </div>

        {/* SPLIT VIEW LAYOUT */}
        <div className="flex flex-col xl:flex-row gap-8">
          
          {/* VIEW 1: ACTION REQUIRED */}
          <div className={`xl:w-1/3 xl:block ${activeTab === 'action' ? 'block' : 'hidden'}`}>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[700px]">
              <div className="mb-6 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-black text-navy-900">Action Required</h2>
                <span className="bg-gold-100 text-gold-800 text-xs font-black px-3 py-1 rounded-full">
                  {dueStudents.length} Due
                </span>
              </div>

              <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
                {dueStudents.length === 0 ? (
                  <div className="text-center text-slate-400 font-medium py-10">No pending sessions to collect.</div>
                ) : (
                  dueStudents.map((student) => (
                    <div key={student.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-navy-900">{SNT(student.full_name)}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Grade {student.grade_batch}</p>
                        </div>
                        <div className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-center shadow-sm">
                          <span className="block font-black text-navy-900 leading-none">{student.sessions_attended}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Sessions</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPaymentModal(student)}
                        className="w-full py-2.5 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors shadow-sm"
                      >
                        Log Payment
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* VIEW 2: TRANSACTION HISTORY */}
          <div className={`xl:w-2/3 xl:block ${activeTab === 'history' ? 'block' : 'hidden'}`}>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <h3 className="text-xl font-black text-navy-900">Transaction History</h3>
                <input 
                  type="text" 
                  placeholder="Search student, ID, or notes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 p-2.5 rounded-xl border border-slate-200 outline-none focus:border-navy-500 shadow-sm font-medium text-sm"
                />
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {isLoading ? (
                  <div className="p-16 text-center animate-pulse text-slate-400 font-bold text-lg">Loading financial records...</div>
                ) : filteredLedger.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 font-medium">No transactions found matching your search.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-sm">
                      <tr className="text-slate-400 text-xs uppercase tracking-widest">
                        <th className="p-4 font-bold whitespace-nowrap">Date</th>
                        <th className="p-4 font-bold">Student</th>
                        <th className="p-4 font-bold">Notes</th>
                        <th className="p-4 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredLedger.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                          
                          <td className="p-4 whitespace-nowrap">
                            <p className="font-bold text-navy-900">
                              {new Date(payment.paid_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">
                              {new Date(payment.paid_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                            </p>
                          </td>
                          
                          <td className="p-4">
                            <p className="font-bold text-navy-900">{SNT(payment.student?.full_name || "Unknown")}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{payment.student?.qr_code || "N/A"}</p>
                          </td>
                          
                          <td className="p-4 max-w-[200px]">
                            <p className="text-sm font-medium text-slate-600 truncate" title={payment.notes}>
                              {payment.notes}
                            </p>
                          </td>
                          
                          <td className="p-4 text-right">
                            <span className="font-mono font-black text-navy-900 text-base whitespace-nowrap">
                              Rs {Number(payment.amount).toLocaleString()}
                            </span>
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
      </div>
    </div>
  );
}
