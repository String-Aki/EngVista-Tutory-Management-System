import EnrollStudentForm from "@/components/EnrollStudentForm";
import { supabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";

export default async function StudentsDirectory() {
  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch students:", error);
  }

  return (
    <main className="p-4 md:p-8 min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <header className="mb-8 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">Student Directory</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Manage admissions, IDs, and profiles</p>
        </header>

        {/* FIX: Changed back to items-start so the columns don't stretch each other */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
          
          <section className="xl:col-span-5 w-full max-w-md mx-auto xl:max-w-none xl:mx-0 animate-in slide-in-from-bottom-8 fade-in duration-700">
            <EnrollStudentForm />
          </section>

          {/* FIX: Locked strict fixed height (h-[600px]) and forced overflow-hidden */}
          <section className="xl:col-span-7 w-full max-w-3xl mx-auto xl:max-w-none xl:mx-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col h-[600px] overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-500">🎓</span> Enrolled Students
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {students?.length || 0} Active
              </span>
            </h2>

            {/* This container will now correctly scroll internally */}
            <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
              {students && students.length > 0 ? (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 md:p-5 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group shadow-sm"
                  >
                    <div>
                      <h3 className="font-black text-slate-800 group-hover:text-slate-900 transition-colors leading-tight">
                        {student.full_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Batch {student.grade_batch}
                        </p>
                        {student.contact_number && (
                          <>
                            <span className="text-slate-300">•</span>
                            <p className="text-xs font-bold text-slate-500 tracking-wider">
                              {student.contact_number}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] uppercase tracking-widest font-black rounded-lg group-hover:border-slate-300 group-hover:text-slate-800 transition-colors shadow-sm">
                        {student.qr_code}
                      </span>
                      <span className="text-[10px] font-black text-slate-600 flex items-center gap-1 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        🗓️ {student.cycle_classes || 0}/8 Sessions
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                  <span className="text-4xl opacity-50 mb-4 grayscale">📇</span>
                  <p className="text-lg font-bold text-slate-500">No students enrolled yet.</p>
                  <p className="text-sm font-medium mt-1">Use the form on the left to add your first student.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}