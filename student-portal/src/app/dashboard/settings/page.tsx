"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, KeyRound, Check, AlertCircle } from "lucide-react";

export default function StudentSettingsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const activeStudentId = localStorage.getItem("icms_active_student");
    if (!activeStudentId) {
      router.replace("/");
    } else {
      setStudentId(activeStudentId);
    }
  }, [router]);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPin !== confirmPin) {
      setError("New passcodes do not match.");
      return;
    }

    if (newPin.length !== 4 || currentPin.length !== 4) {
      setError("Passcodes must be exactly 4 digits.");
      return;
    }

    if (!studentId) return;

    setIsLoading(true);

    try {
      // Step 1: Verify current PIN
      const { data: student, error: verifyError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("pin_code", currentPin)
        .single();

      if (verifyError || !student) {
        throw new Error("The current passcode you entered is incorrect.");
      }

      // Step 2: Update PIN
      const { error: updateError } = await supabase
        .from("students")
        .update({ pin_code: newPin })
        .eq("id", studentId);

      if (updateError) throw updateError;

      setSuccess(true);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      setError(err.message || "Failed to update passcode. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!studentId) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans relative overflow-hidden">
      {/* Background Meshes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_rgba(226,232,240,0.4)_0%,_transparent_60%)]"></div>
        <div className="absolute bottom-[10%] -left-[10%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_rgba(241,245,249,0.5)_0%,_transparent_60%)]"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-6 active:scale-95 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings Hub</h1>
          <p className="text-slate-500 font-medium">Manage your account security and preferences.</p>
        </div>

        {/* Change PIN Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Update Passcode</h2>
              <p className="text-xs font-bold text-slate-500 tracking-wide">Change your 4-digit security PIN</p>
            </div>
          </div>

          <form onSubmit={handleChangePin} className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-sm font-bold text-emerald-600">Your passcode was updated successfully.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Current Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  value={currentPin}
                  onChange={(e) => {
                    setCurrentPin(e.target.value);
                    setError("");
                    setSuccess(false);
                  }}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-400 focus:bg-white text-slate-800 font-mono text-xl tracking-[0.5em] font-bold transition-all placeholder-slate-300"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  New Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 focus:bg-white text-slate-800 font-mono text-xl tracking-[0.5em] font-bold transition-all placeholder-slate-300"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Confirm New Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-400 focus:bg-white text-slate-800 font-mono text-xl tracking-[0.5em] font-bold transition-all placeholder-slate-300"
                  placeholder="••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
              className="w-full py-4 mt-2 bg-slate-800 text-white font-black text-base rounded-[1.25rem] shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98] hover:bg-slate-900 flex justify-center items-center"
            >
              {isLoading ? "Verifying..." : "Update Passcode"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
