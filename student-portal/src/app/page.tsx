"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Scanner, outline } from "@yudiel/react-qr-scanner";
import { Camera, X, Plus, ChevronRight, AlertCircle } from "lucide-react";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function StudentLoginGateway() {
  const router = useRouter();

  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [view, setView] = useState<"picker" | "login">("login");

  const [shortId, setShortId] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Load saved accounts on mount
  useEffect(() => {
    const storedAccounts = localStorage.getItem("icms_saved_accounts");
    const lastActiveId = localStorage.getItem("icms_active_student");

    if (storedAccounts) {
      const accounts = JSON.parse(storedAccounts);
      if (accounts.length > 0) {
        setSavedAccounts(accounts);

        if (lastActiveId) {
          const defaultAccount = accounts.find(
            (a: any) => a.id === lastActiveId,
          );
          if (defaultAccount) {
            setShortId(defaultAccount.qrCode);
            setSelectedName(defaultAccount.fullName);
            setView("login");
          } else {
            setView("picker");
          }
        } else {
          setView("picker");
        }
      }
    }
  }, []);

  const formatShortId = (value: string) => {
    let raw = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let formatted = raw;
    if (raw.length > 4)
      formatted = raw.substring(0, 4) + "-" + raw.substring(4);
    if (raw.length > 5)
      formatted =
        raw.substring(0, 4) +
        "-" +
        raw.substring(4, 5) +
        "-" +
        raw.substring(5, 11);
    return formatted;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data: student, error: fetchError } = await supabase
        .from("students")
        .select("id, full_name, qr_code, is_active")
        .eq("qr_code", shortId)
        .eq("pin_code", pin)
        .single();

      if (fetchError || !student) {
        throw new Error("Invalid ID or Passcode.");
      }

      if (!student.is_active) {
        throw new Error("This account is currently inactive.");
      }

      // Save to local storage for quick switching
      localStorage.setItem("icms_active_student", student.id);

      const newAccount = {
        id: student.id,
        fullName: student.full_name,
        qrCode: student.qr_code,
      };

      const updatedAccounts = [
        ...savedAccounts.filter((a) => a.id !== student.id),
        newAccount,
      ];
      localStorage.setItem(
        "icms_saved_accounts",
        JSON.stringify(updatedAccounts),
      );

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to connect to the academy server.");
      setIsLoading(false);
    }
  };

  const selectProfile = (account: any) => {
    setShortId(account.qrCode);
    setSelectedName(account.fullName);
    setPin("");
    setError("");
    setView("login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background Meshes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,_rgba(191,219,254,0.4)_0%,_transparent_60%)]"></div>
        <div className="absolute bottom-[10%] -left-[10%] w-[40vw] h-[40vw] bg-[radial-gradient(circle,_rgba(186,230,253,0.3)_0%,_transparent_60%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center bg-white rounded-[2rem] border-2 border-blue-50 shadow-sm p-3 transform -rotate-2 transition-all duration-300">
              <img
                src="/icon.png"
                alt="ICT Cram Logo"
                className="w-full h-full object-contain scale-110"
              />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">
              ICT Cram
            </h1>
            <p className="text-blue-500 font-bold mt-2 text-sm uppercase tracking-widest">
              Student Access Node
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-[1.25rem] flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600 leading-tight">
                {error}
              </p>
            </div>
          )}

          {/* === ACCOUNT PICKER VIEW === */}
          {view === "picker" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-2 gap-3">
                {savedAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => selectProfile(account)}
                    className="flex flex-col items-center gap-3 p-5 rounded-[1.5rem] bg-white border-2 border-slate-100 active:border-blue-300 active:bg-blue-50 active:scale-[0.98] transition-all group shadow-sm hover:border-slate-200"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 group-active:border-blue-300 flex items-center justify-center text-lg font-black text-slate-500 group-active:text-blue-600 transition-colors">
                      {getInitials(account.fullName)}
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-active:text-blue-700 text-center line-clamp-1 w-full transition-colors">
                      {account.fullName.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShortId("");
                  setSelectedName("");
                  setPin("");
                  setError("");
                  setView("login");
                }}
                className="w-full py-4 mt-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 bg-slate-50 rounded-[1.25rem] transition-all active:scale-[0.98] active:bg-slate-100 active:text-slate-700 border border-transparent hover:border-slate-200"
              >
                <Plus className="w-4 h-4" /> Add Another Student
              </button>
            </div>
          )}

          {/* === LOGIN VIEW === */}
          {view === "login" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {isScanning ? (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="rounded-[1.5rem] overflow-hidden bg-slate-900 aspect-square relative">
                      <Scanner
                        onScan={(result) => {
                          if (result && result.length > 0) {
                            setShortId(formatShortId(result[0].rawValue));
                            setIsScanning(false);
                            setError("");
                          }
                        }}
                        formats={["qr_code"]}
                        components={{ tracker: outline }}
                        sound={false}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsScanning(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-[1.25rem] transition-all active:scale-[0.98] active:bg-slate-200"
                  >
                    Cancel Camera
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Selected Profile Header */}
                  {selectedName && (
                    <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 relative">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center text-lg font-black text-blue-500 shadow-sm shrink-0">
                        {getInitials(selectedName)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Logging in as
                        </p>
                        <p className="text-base font-black text-slate-800 line-clamp-1">
                          {selectedName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setView("picker")}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 active:bg-slate-200 active:text-slate-700 active:scale-90 transition-all border border-slate-200 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!selectedName && (
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          Student ID
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsScanning(true)}
                          className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all active:scale-[0.96] active:bg-blue-100"
                        >
                          <Camera className="w-3 h-3" /> Scan ID
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={shortId}
                        onChange={(e) => {
                          setShortId(formatShortId(e.target.value));
                          setError("");
                        }}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-slate-800 font-mono text-lg font-black placeholder-slate-300 transition-all uppercase shadow-sm"
                        placeholder="ICMS-E-19MH06"
                      />
                    </div>
                  )}

                  {/* The PIN Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Passcode
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      required
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setError("");
                      }}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-slate-800 font-mono text-center text-4xl font-black tracking-[0.5em] placeholder-slate-300 transition-all shadow-sm"
                      placeholder="••••"
                    />
                  </div>

                  {/* Azure Blue Primary Button */}
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      pin.length < 4 ||
                      (shortId.length === 0 && !selectedName)
                    }
                    className="w-full py-4 mt-2 bg-blue-500 text-white font-black text-base rounded-[1.25rem] shadow-[0_4px_14px_0_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 hover:bg-blue-600"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Signing In...</span>
                    ) : (
                      <>
                        Sign In <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {!selectedName && savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setView("picker")}
                      className="w-full text-center text-xs font-bold text-slate-400 active:text-blue-500 pt-4 transition-colors"
                    >
                      Wait, I already saved my profile!
                    </button>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
