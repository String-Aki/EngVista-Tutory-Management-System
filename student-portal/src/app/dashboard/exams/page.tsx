"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GraduationCap, ArrowLeft, FileText, Zap } from "lucide-react";

export default function ExamVaultPage() {
  const router = useRouter();
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/"); 
        return;
      }

      try {
        // Fetch results AND join the exams table to get the title and total_marks
        const { data, error } = await supabase
          .from("exam_results")
          .select(`
            id,
            score,
            xp_awarded,
            awarded_at,
            exams (
              title,
              total_marks
            )
          `)
          .eq("student_id", studentId)
          .order("awarded_at", { ascending: false });

        if (error) throw error;
        setResults(data || []);

      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs animate-pulse">Decrypting Scores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-cyan-500 selection:text-white pb-24 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        
        {/* Header */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 flex items-center gap-4">
            <GraduationCap className="w-10 h-10 text-cyan-500" /> Exam Records
          </h1>
          <p className="text-cyan-300 font-bold uppercase tracking-widest text-xs">
            Performance History
          </p>
        </div>

        {/* Results Grid */}
        {results.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md animate-in fade-in duration-700 flex flex-col items-center justify-center">
            <FileText className="w-16 h-16 mb-4 text-slate-400 opacity-50" />
            <p className="font-bold text-slate-400">No exam records found.</p>
            <p className="text-sm text-slate-500 mt-2">Scores will appear here once tests are graded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result, index) => {
              // Calculate performance percentage for color coding
              const percentage = (result.score / result.exams.total_marks) * 100;
              
              // Dynamic color based on score
              let scoreColor = "text-emerald-400";
              let ringColor = "ring-emerald-400/30";
              let bgGlow = "bg-emerald-400/10";
              
              if (percentage < 50) {
                scoreColor = "text-red-400";
                ringColor = "ring-red-400/30";
                bgGlow = "bg-red-400/10";
              } else if (percentage < 75) {
                scoreColor = "text-amber-400";
                ringColor = "ring-amber-400/30";
                bgGlow = "bg-amber-400/10";
              }

              return (
                <div 
                  key={result.id} 
                  className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all flex flex-col justify-between animate-in slide-in-from-bottom-8 fade-in h-full relative overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl ${bgGlow} pointer-events-none`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-slate-800 text-slate-300 font-black text-[10px] px-2 py-1 rounded-md uppercase tracking-widest border border-slate-700">
                        Official Score
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(result.awarded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    
                    <h3 className="font-black text-xl text-slate-200 mb-6 leading-tight">
                      {result.exams.title}
                    </h3>

                    <div className="flex items-end justify-between mt-auto">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Score</p>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-black ${scoreColor}`}>
                            {result.score}
                          </span>
                          <span className="text-lg font-bold text-slate-500">
                            / {result.exams.total_marks}
                          </span>
                        </div>
                      </div>

                      {/* XP Badge */}
                      {result.xp_awarded > 0 && (
                        <div className={`px-3 py-2 rounded-xl ring-1 ${ringColor} ${bgGlow} flex items-center gap-1.5`}>
                          <Zap className={`w-3.5 h-3.5 ${scoreColor}`} />
                          <span className={`font-black text-sm ${scoreColor}`}>+{result.xp_awarded} XP</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}