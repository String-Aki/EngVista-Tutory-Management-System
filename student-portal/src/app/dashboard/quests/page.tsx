"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Target,
  Zap,
  Clock,
  X,
  Link as LinkIcon,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const formatDescriptionWithLinks = (text: string) => {
  if (!text) return "No description provided.";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    part.match(urlRegex) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 font-bold underline decoration-indigo-200 underline-offset-4 hover:text-indigo-500 transition-colors"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
};

function QuestsRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questIdFromUrl = searchParams.get("id");

  const [quests, setQuests] = useState<any[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = selectedQuest ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedQuest]);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const activeStudentId = localStorage.getItem("icms_active_student");
        const { data: student } = await supabase
          .from("students")
          .select("grade_batch")
          .eq("id", activeStudentId)
          .single();

        const { data: allQuests } = await supabase
          .from("class_materials")
          .select("*")
          .in("grade_batch", [student?.grade_batch, "All"])
          .eq("type", "homework")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        const filteredQuests = (allQuests || []).filter((q: any) => {
          let targets = q.target_students;
          if (typeof targets === 'string') {
             try { targets = JSON.parse(targets); } 
             catch(e) { targets = targets.replace(/[{}]/g, '').split(',').map((s: string) => s.trim()); }
          }
          if (Array.isArray(targets)) {
             const validTargets = targets.filter((t: string) => t && t.length > 5);
             if (validTargets.length > 0) return validTargets.includes(activeStudentId);
          }
          return true;
        });

        setQuests(filteredQuests);

        if (questIdFromUrl && filteredQuests) {
          const found = filteredQuests.find((q) => q.id === questIdFromUrl);
          if (found) setSelectedQuest(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuests();
  }, [questIdFromUrl]);

  if (isLoading)
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-indigo-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Syncing Quests...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-24 relative overflow-hidden">
      {/* Light Mode Soft Orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        {/* Sleek Navigation */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight drop-shadow-sm mb-2 flex items-center gap-4">
            Quest Board
          </h1>
          <p className="text-indigo-500 font-bold uppercase tracking-widest text-xs">
            Active Homework & Tasks
          </p>
        </div>

        {/* Master List */}
        <div className="grid gap-4">
          {quests.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-700">
              <span className="text-5xl mb-4 block grayscale opacity-40">
                🎯
              </span>
              <p className="font-bold text-slate-500">All caught up!</p>
              <p className="text-sm text-slate-400 mt-2">
                Check back later for new quests.
              </p>
            </div>
          ) : (
            quests.map((quest, index) => (
              <div
                key={quest.id}
                onClick={() => setSelectedQuest(quest)}
                className={`bg-white p-5 md:p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] animate-in slide-in-from-bottom-8 fade-in ${selectedQuest?.id === quest.id ? "border-indigo-400 shadow-[0_8px_30px_rgba(79,70,229,0.12)] ring-1 ring-indigo-400" : "border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-md"}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedQuest?.id === quest.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-12" : "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100"}`}
                  >
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight mb-2">
                      {quest.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-amber-50 border border-amber-100 text-amber-600 font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                        <Zap className="w-3 h-3 text-amber-500" /> +
                        {quest.xp_reward} XP
                      </span>
                      {quest.deadline && (
                        <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Due{" "}
                          {new Date(quest.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- REDESIGNED LIGHT MODAL --- */}
      {selectedQuest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 h-[100dvh]">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedQuest(null)}
          ></div>

          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-b from-indigo-50/50 to-white p-6 sm:p-8 border-b border-slate-100 shrink-0 relative">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-indigo-100 text-indigo-700 font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <Target className="w-3.5 h-3.5" /> Quest Brief
                </span>
                <button
                  onClick={() => setSelectedQuest(null)}
                  className="w-8 h-8 bg-white border border-slate-200 hover:bg-slate-50 hover:text-rose-500 text-slate-400 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-2xl font-black text-slate-800 leading-tight mb-6">
                {selectedQuest.title}
              </h2>

              <div className="flex flex-wrap gap-3">
                {/* Light Theme XP Block */}
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl shadow-sm">
                  <div className="w-8 h-8 bg-white border border-amber-100 text-amber-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="pr-2">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">
                      Reward
                    </p>
                    <p className="text-sm font-bold text-amber-700 leading-none">
                      +{selectedQuest.xp_reward} XP
                    </p>
                  </div>
                </div>

                {/* Light Theme Deadline Block */}
                {selectedQuest.deadline && (
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl shadow-sm">
                    <div className="w-8 h-8 bg-white border border-rose-100 text-rose-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="pr-2">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">
                        Deadline
                      </p>
                      <p className="text-sm font-bold text-rose-600 leading-none">
                        {new Date(selectedQuest.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto overscroll-contain bg-white">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Description
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm sm:text-base mb-8">
                {formatDescriptionWithLinks(selectedQuest.description)}
              </p>

              {selectedQuest.resource_url && (
                <a
                  href={selectedQuest.resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.25rem] transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(79,70,229,0.25)] active:scale-[0.98]"
                >
                  <LinkIcon className="w-5 h-5" /> Open Quest Resource
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-indigo-500 font-bold uppercase tracking-widest text-xs animate-pulse">
            Syncing Quests...
          </p>
        </div>
      }
    >
      <QuestsRegistryContent />
    </Suspense>
  );
}
