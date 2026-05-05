"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PropagateLoader } from "react-spinners";

// Import components
import TopNav from "@/components/dashboard/TopNav";
import HeroStats from "@/components/dashboard/HeroStats";
import QuestHub from "@/components/dashboard/QuestHub";
import ClassCycle from "@/components/dashboard/ClassCycle";
import ScheduleButton from "@/components/dashboard/ScheduleButton";
import ArenaButton from "@/components/dashboard/ArenaButton";
import VaultButton from "@/components/dashboard/VaultButton";
import ExamVaultButton from "@/components/dashboard/ExamVaultButton";
import PaymentsButton from "@/components/dashboard/PaymentsButton";
import AchievementsButton from "@/components/dashboard/AchievementsButton";
import XpLedgerButton from "@/components/dashboard/XpLedgerButton";
import SettingsButton from "@/components/dashboard/SettingsButton";
import PushSubscriber from "@/components/dashboard/PushSubscriber";

export default function StudentDashboard() {
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
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
            "id, full_name, qr_code, total_xp, card_variant, cycle_classes, grade_batch",
          )
          .eq("id", activeStudentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        const { data: materials, error: matError } = await supabase
          .from("class_materials")
          .select("*")
          .in("grade_batch", [studentData.grade_batch, "All"])
          .eq("type", "homework")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (matError) throw matError;

        const { data: submissions, error: subError } = await supabase
          .from("homework_submissions")
          .select("material_id")
          .eq("student_id", studentData.id);

        if (subError) throw subError;

        const filteredMaterials = (materials || []).filter((q: any) => {
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

        const completedIds = new Set(
          submissions?.map((s) => s.material_id) || [],
        );
        const pendingQuests =
          filteredMaterials.filter((m) => !completedIds.has(m.id));

        setActiveQuests(pendingQuests);
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
        {/* Soft ambient blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[radial-gradient(circle,_rgba(191,219,254,0.3)_0%,_transparent_70%)] animate-pulse pointer-events-none"></div>

        <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(59,130,246,0.1)] border border-blue-50 flex flex-col items-center justify-center h-32 w-56 gap-8">
          <div className="mt-4">
            <PropagateLoader color="#3B82F6" size={12} speedMultiplier={1.1} />
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Ambient Background Meshes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_rgba(191,219,254,0.3)_0%,_transparent_60%)]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_rgba(186,230,253,0.3)_0%,_transparent_60%)]"></div>
      </div>

      <div className="relative z-10">
        <PushSubscriber />
        <TopNav studentName={student.full_name} />

        <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
          <HeroStats
            totalXp={student.total_xp}
            cardVariant={student.card_variant}
            qrCode={student.qr_code}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuestHub activeQuests={activeQuests} />
            <ClassCycle
              studentId={student.id}
              cycleClasses={student.cycle_classes}
            />
            <ScheduleButton />

            <VaultButton />
            <ExamVaultButton />
            <PaymentsButton />
            <AchievementsButton />
            <XpLedgerButton />
            <SettingsButton />

            <div className="md:col-span-2 mt-2">
              <ArenaButton />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
