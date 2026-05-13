"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PropagateLoader } from "react-spinners";

// Import components
import HeroStats from "@/components/dashboard/HeroStats";
import ClassCycle from "@/components/dashboard/ClassCycle";
import ScheduleButton from "@/components/dashboard/ScheduleButton";
import LeaderboardButton from "@/components/dashboard/LeaderboardButton";
import PaymentsButton from "@/components/dashboard/PaymentsButton";
import XpLedgerButton from "@/components/dashboard/XpLedgerButton";
import PushSubscriber from "@/components/dashboard/PushSubscriber";

export default function StudentDashboard() {
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const activeStudentId = localStorage.getItem("icms_active_student");
      if (!activeStudentId) {
        router.replace("/");
        return;
      }

      try {
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(
            "id, full_name, qr_code, total_xp, card_variant, sessions_attended, grade_batch",
          )
          .eq("id", activeStudentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (error?.code === 'PGRST116') {
          localStorage.removeItem("icms_active_student");
          router.replace("/");
        }
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[radial-gradient(circle,_rgba(245,158,11,0.15)_0%,_transparent_70%)] animate-pulse pointer-events-none"></div>

        <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(15,23,42,0.05)] border border-slate-100 flex flex-col items-center justify-center h-32 w-56 gap-8">
          <div className="mt-4">
            <PropagateLoader color="#0F172A" size={12} speedMultiplier={1.1} />
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse ml-5">
            Syncing...
          </p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-amber-100 selection:text-amber-900 relative overflow-hidden">
      {/* Ambient Background Meshes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_rgba(15,23,42,0.03)_0%,_transparent_60%)]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_rgba(245,158,11,0.05)_0%,_transparent_60%)]"></div>
      </div>

      <div className="relative z-10">
        <PushSubscriber />
        
        {/* Simple top header replacing TopNav for the vertical feed */}
        <header className="px-6 py-6 pt-8 md:pt-10 max-w-4xl mx-auto">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-2xl font-black text-slate-800 line-clamp-1">Welcome, {student.full_name}</h1>
        </header>

        <main className="px-4 pb-8 md:px-8 max-w-4xl mx-auto space-y-4 flex flex-col">
          <HeroStats
            totalXp={student.total_xp}
            cardVariant={student.card_variant}
            qrCode={student.qr_code}
          />

          <ClassCycle
            studentId={student.id}
            cycleClasses={student.sessions_attended}
          />
          
          <ScheduleButton />

          <div className="grid grid-cols-2 gap-4">
            <PaymentsButton />
            <XpLedgerButton />
          </div>

          <LeaderboardButton />
        </main>
      </div>
    </div>
  );
}
