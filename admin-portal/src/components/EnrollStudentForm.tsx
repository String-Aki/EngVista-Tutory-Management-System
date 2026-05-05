"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { League_Spartan, Prata } from "next/font/google";
import SNT from "@/components/StudentNameTransformer";

const leagueSpartan = League_Spartan({ subsets: ["latin"], weight: ["400", "700", "800"] });
const prata = Prata({ subsets: ["latin"], weight: ["400"] });

interface EnrolledStudent {
  fullName: string;
  gradeBatch: string;
  shortId: string;
  variant: number;
  pin: string;
}

const getMonthLetters = (dateStr: string) => {
  const date = new Date(dateStr);
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const monthName = months[date.getMonth()];
  return `${monthName.charAt(0)}${monthName.charAt(monthName.length - 1)}`;
};

const getSequenceString = (existingCount: number) => {
  if (existingCount < 99) {
    return (existingCount + 1).toString().padStart(2, '0');
  } else {
    const overflow = existingCount - 99;
    const numberPrefix = Math.floor(overflow / 26) + 1;
    const letterSuffix = String.fromCharCode(65 + (overflow % 26));
    return `${numberPrefix}${letterSuffix}`;
  }
};

export default function EnrollStudentForm() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState("");
  const [gradeBatch, setGradeBatch] = useState("");
  const [medium, setMedium] = useState<"E" | "T">("E");

  const [isAdmissionFeeApplied, setIsAdmissionFeeApplied] = useState(true);
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState("500");
  const [admissionFeeStatus, setAdmissionFeeStatus] = useState<"paid" | "unpaid">("paid");

  const getTodayString = () => new Date().toISOString().split("T")[0];
  const [enrollDate, setEnrollDate] = useState(getTodayString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [newStudent, setNewStudent] = useState<EnrolledStudent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const generatedPin = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    try {
      const dayStr = enrollDate.split("-")[2];
      const monthLetters = getMonthLetters(enrollDate);
      const dateCode = `${dayStr}${monthLetters}`;
      const idPrefix = `ICMS-${medium}-${dateCode}`;
      
      const { count, error: countError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      const sequence = getSequenceString(count || 0);
      const finalShortId = `${idPrefix}${sequence}`;
      const rolledVariant = Math.floor(Math.random() * 6) + 1; 

      const { data: studentData, error: insertError } = await supabase
        .from("students")
        .insert([{
            full_name: fullName,
            grade_batch: gradeBatch,
            qr_code: finalShortId,
            card_variant: rolledVariant,
            enrollment_date: enrollDate,
            pin_code: generatedPin,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (studentData) {
        const { error: queueError } = await supabase
          .from("card_print_queue")
          .insert([{ student_id: studentData.id }]);
        
        if (queueError) console.error("Failed to queue card:", queueError);

        if (isAdmissionFeeApplied && admissionFeeStatus === "paid") {
          const amountParsed = parseFloat(admissionFeeAmount);
          if (amountParsed > 0) {
            const { error: payError } = await supabase
              .from("payments")
              .insert([{
                student_id: studentData.id,
                amount: amountParsed,
                payment_month: enrollDate,
                notes: "Admission Fee"
              }]);
            if (payError) console.error("Failed to record admission fee:", payError);
          }
        }
      }

      const qrImage = await QRCode.toDataURL(finalShortId, { margin: 0, width: 200 });
      setQrDataUrl(qrImage);

      setNewStudent({
        fullName,
        gradeBatch,
        shortId: finalShortId,
        variant: rolledVariant,
        pin: generatedPin,
      });

      setFullName("");
      setGradeBatch("");
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setErrorMsg(`❌ Error: ${error?.message || "Failed to enroll student. Ensure database is connected."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closePrintRoom = () => {
    setNewStudent(null);
    setQrDataUrl("");
  };

  return (
    <>
      {/* Modal logic remains entirely unchanged to preserve your specific ID Card alignment mapping */}
      {newStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-5xl w-full border border-slate-200 my-4 animate-in zoom-in-95 duration-500">
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
                <span className="text-2xl md:text-3xl">🎉</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Student Enrolled!</h2>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-sm">
              <div className="text-center sm:text-left">
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">App Login PIN</p>
                <p className="text-xs font-bold text-slate-500 mt-1">Temporary password for first login.</p>
              </div>
              <div className="bg-white px-6 py-3 rounded-xl border border-indigo-200 shadow-sm">
                <p className="text-3xl font-mono font-black text-slate-800 tracking-[0.2em] m-0">{newStudent.pin}</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center justify-center mb-10">
              {/* --- FRONT CARD --- */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] bg-slate-100 px-3 py-1 rounded-full">Front Preview</span>
                <div className="relative bg-white overflow-hidden shadow-2xl rounded-sm ring-1 ring-slate-200/50" style={{ width: "324px", height: "204px" }}>
                  <img src="/id-front.jpg" alt="Front" className="absolute inset-0 w-full h-full object-cover z-0" />
                  <div className="absolute z-10 top-[42px] left-[190px] w-[110px]">
                    <p className={`text-[13px] text-black m-0 leading-[1.15] font-extrabold tracking-tight break-words ${leagueSpartan.className}`}>{SNT(newStudent.fullName)}</p>
                  </div>
                  <div className="absolute z-10 top-[80px] left-[190px]">
                    <p className={`text-sm text-black m-0 leading-none font-extrabold tracking-tight ${leagueSpartan.className}`}>{newStudent.gradeBatch}</p>
                  </div>
                  <div className="absolute z-10 bottom-[35px] left-[95px]">
                     <p className={`text-sm tracking-[0.13em] text-black m-0 leading-none ${prata.className}`}>{newStudent.shortId}</p>
                  </div>
                  {qrDataUrl && (
                    <div className="absolute z-10 top-[30px] left-[30px] w-[80px] h-[80px] bg-white p-1 rounded-sm shadow-sm">
                      <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              {/* --- BACK CARD --- */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-amber-500 font-black uppercase tracking-[0.2em] text-[10px] bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">Back Preview (Variant {newStudent.variant})</span>
                <div className="relative bg-white overflow-hidden shadow-2xl rounded-sm ring-1 ring-slate-200/50" style={{ width: "324px", height: "204px" }}>
                  <img src={`/id-back-${newStudent.variant}.jpg`} alt="Back" className="absolute inset-0 w-full h-full object-cover z-0" />
                </div>
              </div>
            </div>

            <div className="flex w-full justify-center max-w-md">
              <button 
                onClick={closePrintRoom}
                className="w-full py-4 px-6 font-black text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all shadow-xl hover:-translate-y-1 active:scale-95"
              >
                Done & Next Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- THE UPGRADED ADMISSION DESK FORM --- */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-2xl">✍️</div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight tracking-tight">New Admission</h2>
        </div>
        
        <form onSubmit={handleEnrollment} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Class Medium</label>
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <button type="button" onClick={() => setMedium("E")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${medium === "E" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>English</button>
              <button type="button" onClick={() => setMedium("T")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${medium === "T" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>Tamil</button>
            </div>
          </div>

          {/* Date of Enrollment - "Today" button removed and styling updated */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date of Enrollment</label>
            <input type="date" required className="w-full bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none transition-all" value={enrollDate} onChange={(e) => setEnrollDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input type="text" required className="w-full bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300 placeholder:font-medium" placeholder="e.g. Bruce Wayne" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Grade / Batch</label>
            <input type="text" required className="w-full bg-white border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300 placeholder:font-medium" placeholder="e.g. 10" value={gradeBatch} onChange={(e) => setGradeBatch(e.target.value)} />
          </div>

          {/* ADMISSION FEE BLOCK */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
               <div>
                 <span className="text-sm font-black text-slate-800 block">Admission Fee</span>
                 <p className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">Initial Enrollment Charge</p>
               </div>
               <button type="button" onClick={() => setIsAdmissionFeeApplied(!isAdmissionFeeApplied)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAdmissionFeeApplied ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAdmissionFeeApplied ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
            </div>
            
            {isAdmissionFeeApplied && (
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                 <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                   <button type="button" onClick={() => setAdmissionFeeStatus("paid")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${admissionFeeStatus === "paid" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Paid Now</button>
                   <button type="button" onClick={() => setAdmissionFeeStatus("unpaid")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${admissionFeeStatus === "unpaid" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>Unpaid (Save purely to file)</button>
                 </div>
                 
                 <div>
                    <label className="block text-[11px] font-black text-indigo-800/60 uppercase tracking-widest mb-1.5 ml-1">Fee Amount (LKR)</label>
                    <input type="number" required={isAdmissionFeeApplied} value={admissionFeeAmount} onChange={e => setAdmissionFeeAmount(e.target.value)} className="w-full bg-white border-2 border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-lg px-3 py-3 text-slate-800 font-black text-base outline-none transition-all shadow-sm" />
                 </div>
                 
                 {admissionFeeStatus === "paid" ? (
                   <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                      <span className="text-sm">✓</span> A receipt will be instantly generated to the student's ledger.
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      <span className="text-sm">⏳</span> Pending. Collect later using the "Add Custom Fee" tool in the Financials Hub.
                   </div>
                 )}
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full py-4 mt-4 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25"}`}>
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Enroll Student"}
          </button>
        </form>

        {errorMsg && <div className="mt-4 p-4 rounded-xl text-sm font-bold text-center bg-red-50 text-red-600 border border-red-100 animate-in fade-in">{errorMsg}</div>}
      </div>
    </>
  );
}