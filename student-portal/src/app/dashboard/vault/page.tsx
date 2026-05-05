"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Library, ArrowLeft, Video, FileText, Link as LinkIcon, BookOpen, Inbox, ExternalLink } from "lucide-react";

export default function LibraryPage() {
  const router = useRouter();
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradeBatch, setGradeBatch] = useState("");

  useEffect(() => {
    const fetchVaultData = async () => {
      const studentId = localStorage.getItem("icms_active_student");
      if (!studentId) {
        router.replace("/"); 
        return;
      }

      try {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("grade_batch")
          .eq("id", studentId)
          .single();

        if (studentError) throw studentError;
        setGradeBatch(student.grade_batch);

        const { data: vaultItems, error: matError } = await supabase
          .from("class_materials")
          .select("*")
          .in("grade_batch", [student.grade_batch, "All"])
          .neq("type", "homework")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (matError) throw matError;

        const filteredMaterials = (vaultItems || []).filter((item: any) => {
          let targets = item.target_students;
          if (typeof targets === 'string') {
             try { targets = JSON.parse(targets); } 
             catch(e) { targets = targets.replace(/[{}]/g, '').split(',').map((s: string) => s.trim()); }
          }
          if (Array.isArray(targets)) {
             const validTargets = targets.filter((t: string) => t && t.length > 5);
             if (validTargets.length > 0) return validTargets.includes(studentId);
          }
          return true;
        });

        setMaterials(filteredMaterials);

      } catch (error) {
        console.error("Error fetching library materials:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        <p className="text-purple-400 font-bold uppercase tracking-widest text-xs animate-pulse">Opening Library...</p>
      </div>
    );
  }

  // Dynamically returns a Lucide vector based on the material type
  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Video className="w-3 h-3" />;
      case 'note': return <FileText className="w-3 h-3" />;
      case 'pdf': return <FileText className="w-3 h-3" />;
      case 'link': return <LinkIcon className="w-3 h-3" />;
      default: return <BookOpen className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] font-sans selection:bg-purple-500 selection:text-white pb-24 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 relative z-10">
        
        {/* Header */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-purple-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="mb-12 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 flex items-center gap-4">
            <Library className="w-10 h-10 text-purple-500" /> Library
          </h1>
          <p className="text-purple-300 font-bold uppercase tracking-widest text-xs">
            {gradeBatch} Archives
          </p>
        </div>

        {/* Library Grid */}
        {materials.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md animate-in fade-in duration-700 flex flex-col items-center justify-center">
            <Inbox className="w-16 h-16 mb-4 text-slate-400 opacity-50" />
            <p className="font-bold text-slate-400">The library is currently empty.</p>
            <p className="text-sm text-slate-500 mt-2">New materials will appear here when uploaded by the academy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between animate-in slide-in-from-bottom-8 fade-in h-full group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    {/* Replaced emoji array with dynamic Lucide function */}
                    <span className="bg-purple-500/20 text-purple-300 font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-widest border border-purple-500/20 flex items-center gap-1.5">
                      {getIconForType(item.type)} {item.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <h3 className="font-black text-lg text-slate-200 mb-2 leading-tight group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm font-medium text-slate-400 line-clamp-3 mb-6">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.resource_url && (
                  <a 
                    href={item.resource_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                  >
                    Access Resource <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}