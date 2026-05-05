"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { CreditCard, ArrowLeft, ArrowRight, Download, Loader2, X, Check } from "lucide-react";

export default function PaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/");
        return;
      }

      try {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("full_name, qr_code, grade_batch")
          .eq("id", studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("*")
          .eq("student_id", studentId)
          .order("paid_at", { ascending: false });

        if (paymentError) throw paymentError;
        setPayments(paymentData || []);

        // Deeplink Hydration for Push Notifications
        const params = new URLSearchParams(window.location.search);
        const receiptParam = params.get("receipt");
        if (receiptParam && paymentData) {
          const matchingReceipt = paymentData.find(p => p.id === receiptParam);
          if (matchingReceipt) setSelectedReceipt(matchingReceipt);
        }

      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) return;

    setIsDownloading(true);

    try {
      const fullHeight = element.scrollHeight;
      const fullWidth = element.scrollWidth;

      const imgData = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
        },
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (fullHeight * pdfWidth) / fullWidth;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const shortId = selectedReceipt.id.split("-")[0].toUpperCase();
      pdf.save(`ICMS-Receipt-${shortId}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Something went wrong while generating the PDF. Please try again.");
    } finally {
      setIsLoading(false);
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          Accessing Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-emerald-500 selection:text-white pb-24 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 flex items-center gap-4">
            Payment Ledger
          </h1>
          <p className="text-emerald-300 font-bold uppercase tracking-widest text-xs">
            Fee History & Receipts
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md animate-in fade-in duration-700 flex flex-col items-center">
            <CreditCard className="w-16 h-16 mb-4 text-slate-400 opacity-30" />
            <p className="font-bold text-slate-400">No payments found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-3xl hover:bg-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between animate-in slide-in-from-bottom-8 fade-in group gap-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-500/20">
                      Paid
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(payment.paid_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="font-black text-xl text-slate-200 leading-tight">
                    {new Date(payment.payment_month).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" },
                    )}{" "}
                    Fee
                  </h3>

                  {payment.notes && (
                    <p className="text-sm font-medium text-slate-400 line-clamp-1 mt-1">
                      Note: {payment.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                  <span className="text-2xl font-black text-emerald-400">
                    Rs. {payment.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => setSelectedReceipt(payment)}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-300 uppercase tracking-widest mt-1 underline decoration-emerald-500/30 underline-offset-4 transition-colors flex items-center gap-1"
                  >
                    View Receipt <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === RECEIPT MODAL === */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setSelectedReceipt(null)}
          ></div>

          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Action Bar (Not captured in PDF) */}
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Official Receipt
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isDownloading ? "Generating..." : "Download PDF"}
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* === TARGET FOR PDF SCREENSHOT === */}
            <div className="p-8 bg-white" ref={receiptRef}>
              <div className="text-center mb-8 pb-8 border-b-2 border-dashed border-slate-200">
                <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <img src="/icon.png" alt="ICT CRAM Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  ICT CRAM
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Payment Receipt
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400">
                    Date Paid
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {new Date(selectedReceipt.paid_at).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400">
                    Transaction ID
                  </span>
                  <span className="text-xs font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedReceipt.id.split("-")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400">
                    Student ID
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {student?.qr_code}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400">
                    Student Name
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {student?.full_name}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center mb-8">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {new Date(selectedReceipt.payment_month).toLocaleDateString(
                    undefined,
                    { month: "long", year: "numeric" },
                  )}{" "}
                  Tuition Fee
                </p>
                <p className="text-4xl font-black text-emerald-600">
                  Rs. {selectedReceipt.amount.toLocaleString()}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md">
                  <Check className="w-3.5 h-3.5" /> Payment Successful
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Additional Notes
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedReceipt.notes}
                  </p>
                </div>
              )}

              <div className="text-center pt-8 border-t-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">
                  Payment received with thanks. Thank you for choosing ICT Cram.
                </p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                  System Generated Receipt
                </p>
              </div>
            </div>
            {/* === END OF TARGET === */}
          </div>
        </div>
      )}
    </div>
  );
}