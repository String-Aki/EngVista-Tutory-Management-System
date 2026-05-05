"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import SNT from "@/components/StudentNameTransformer";
import { League_Spartan, Prata } from "next/font/google";

const leagueSpartan = League_Spartan({ subsets: ["latin"], weight: ["400", "700", "800"] });
const prata = Prata({ subsets: ["latin"], weight: ["400"] });

export default function PrintHub() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("card_print_queue")
      .select(`
        id,
        added_at,
        student:student_id ( id, full_name, grade_batch, qr_code, card_variant )
      `)
      .eq("status", "pending")
      .order("added_at", { ascending: true });

    if (data) {
      const queueWithQRs = await Promise.all(
        data.map(async (item: any) => {
          const qrDataUrl = await QRCode.toDataURL(item.student.qr_code, { margin: 0, width: 200 });
          return { ...item, qrDataUrl };
        })
      );
      setQueue(queueWithQRs);
    }
    setIsLoading(false);
  };

  const markAsPrinted = async () => {
    if (!confirm("Are you sure you want to clear these from the queue? Only do this AFTER you have successfully printed them.")) return;
    
    setIsMarking(true);
    const ids = queue.map(item => item.id);
    await supabase.from("card_print_queue").update({ status: "printed" }).in("id", ids);
    await fetchQueue();
    setIsMarking(false);
  };

  const CHUNK_SIZE = 8;
  const pages = [];
  for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
    pages.push(queue.slice(i, i + CHUNK_SIZE));
  }
  const totalPages = pages.length * 2; // Front + Back

  const getMirroredBackPage = (chunk: any[]) => {
    const padded = [...chunk];
    while (padded.length % 2 !== 0) {
      padded.push(null);
    }
    const mirrored = [];
    for (let i = 0; i < padded.length; i += 2) {
      mirrored.push(padded[i + 1]); 
      mirrored.push(padded[i]);     
    }
    return mirrored;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* GLOBAL PRINT STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .print-hidden { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}} />

      {/* ========================================= */}
      {/* DIGITAL DASHBOARD (Hidden on Print) */}
      {/* ========================================= */}
      <div className="print-hidden max-w-6xl mx-auto p-4 md:p-8 mb-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-100">
              🖨️
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Logistics Hub</h1>
              <p className="text-slate-500 font-medium mt-1">Manage and export batched ID cards for the print shop.</p>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <button onClick={fetchQueue} className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
              ↻ Refresh
            </button>
            <button 
              onClick={() => window.print()} 
              disabled={queue.length === 0}
              className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              Print Queue
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold animate-pulse">Fetching Print Queue...</p>
          </div>
        ) : queue.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm text-center px-4">
            <div className="text-6xl mb-6 opacity-50 grayscale">✅</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">All Caught Up!</h3>
            <p className="text-slate-500 font-medium max-w-md">There are no pending ID cards in the queue. Enrolling new students on the Admission Desk will automatically add them here.</p>
          </div>
        ) : (
          /* ACTIVE QUEUE UI */
          <div className="space-y-8">
            
            {/* STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-xl">👥</div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Students Queued</p>
                  <p className="text-3xl font-black text-slate-800">{queue.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-xl">📄</div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">A4 Sheets Required</p>
                  <p className="text-3xl font-black text-slate-800">{pages.length}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-xl">⚙️</div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Print Settings</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">No Margins • Duplex On</p>
                </div>
              </div>
            </div>

            {/* QUEUE ROSTER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-800">Waiting Room Roster</h3>
                <button 
                  onClick={markAsPrinted} 
                  disabled={isMarking}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                >
                  {isMarking ? "Clearing..." : "✓ Mark All as Printed"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                      <th className="p-4 font-bold">Student Name</th>
                      <th className="p-4 font-bold">Short ID</th>
                      <th className="p-4 font-bold">Grade</th>
                      <th className="p-4 font-bold text-right">Added To Queue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          {SNT(item.student.full_name)}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs">{item.student.qr_code}</span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">Grade {item.student.grade_batch}</td>
                        <td className="p-4 text-right text-slate-400 font-medium">
                          {new Date(item.added_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* THE A4 CANVAS ENGINE (Visible on Print) */}
      {/* ========================================= */}
      <div className="hidden print:block bg-white w-[210mm] mx-auto">
        {pages.map((chunk, pageIndex) => {
          const mirroredBacks = getMirroredBackPage(chunk);

          return (
            <div key={pageIndex}>
              
              {/* PAGE A: FRONTS (WITH CUT LINES) */}
              <div className="page-break w-[210mm] h-[297mm] pt-[15mm] flex justify-center">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 324px)", gap: "10px", alignContent: "start" }}>
                  {chunk.map((item, i) => (
                    <div key={`front-${i}`} style={{ width: "324px", height: "204px", position: "relative", overflow: "hidden", border: "1px dashed #94a3b8" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/id-front.jpg" alt="Front" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, objectFit: "cover" }} />
                      
                      <div style={{ position: "absolute", zIndex: 10, top: "42px", left: "190px", width: "110px" }}>
                        <p className={`text-[13px] text-black m-0 leading-[1.15] font-extrabold tracking-tight break-words ${leagueSpartan.className}`}>
                          {SNT(item.student.full_name)}
                        </p>
                      </div>

                      <div style={{ position: "absolute", zIndex: 10, top: "80px", left: "190px" }}>
                        <p className={`text-sm text-black m-0 leading-none font-extrabold tracking-tight ${leagueSpartan.className}`}>
                          {item.student.grade_batch}
                        </p>
                      </div>

                      <div style={{ position: "absolute", zIndex: 10, bottom: "35px", left: "95px" }}>
                        <p className={`text-sm text-black m-0 leading-none ${prata.className}`} style={{ letterSpacing: "0.13em" }}>
                          {item.student.qr_code}
                        </p>
                      </div>

                      {item.qrDataUrl && (
                        <div style={{ position: "absolute", zIndex: 10, top: "30px", left: "30px", width: "80px", height: "80px", backgroundColor: "white", padding: "4px", borderRadius: "4px" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.qrDataUrl} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PAGE B: BACKS (NO CUT LINES) */}
              <div className="page-break w-[210mm] h-[297mm] pt-[15mm] flex justify-center">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 324px)", gap: "10px", alignContent: "start" }}>
                  {mirroredBacks.map((item, i) => (
                    <div key={`back-${i}`} style={{ width: "324px", height: "204px", position: "relative", overflow: "hidden" }}>
                      {item ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={`/id-back-${item.student.card_variant}.jpg`} alt="Back" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "324px", height: "204px" }}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}