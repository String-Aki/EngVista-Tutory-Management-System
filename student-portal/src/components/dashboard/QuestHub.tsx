"use client";

import Link from "next/link";
import { Target, Zap, Clock, ChevronRight } from "lucide-react";

export default function QuestHub({ activeQuests }: { activeQuests: any[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-black text-slate-800 text-xl flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" /> Quests
        </h2>
        <Link
        href="/dashboard/quests" 
        className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">
          {activeQuests.length} Pending
        </Link>
      </div>

      {/* Quest List */}
      <div className="flex-1 space-y-3">
        {activeQuests.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="flex justify-center mb-3">
               <Target className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All caught up!</p>
          </div>
        ) : (
          activeQuests.slice(0, 3).map(quest => (
            <Link 
              key={quest.id} 
              href={`/dashboard/quests?id=${quest.id}`}
              className="group bg-white border border-slate-100 shadow-sm p-4 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer block relative overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
              
              <div className="flex justify-between items-start mb-2 pl-2">
                <h3 className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors line-clamp-1 pr-2">
                  {quest.title}
                </h3>
                <span className="shrink-0 bg-amber-100 border border-amber-200 text-amber-700 font-black text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <Zap className="w-3 h-3" /> +{quest.xp_reward}
                </span>
              </div>

              <div className="flex justify-between items-center pl-2">
                {quest.deadline ? (
                  <p className="text-xs font-bold text-red-400 flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3" /> Due {new Date(quest.deadline).toLocaleDateString()}
                  </p>
                ) : <div />}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}