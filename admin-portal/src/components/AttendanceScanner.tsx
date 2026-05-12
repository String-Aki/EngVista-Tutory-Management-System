"use client";

import { useState } from "react";
import { Scanner, outline } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";
import { localDB } from "@/lib/localdb";
import type { TodaySession } from "@/app/check-in/page";

interface AttendanceScannerProps {
  todaySessions: TodaySession[];
  manualSessionId: string | null;
  onScanSuccess?: (
    student: any,
    isOffline: boolean,
    isDuplicate: boolean,
  ) => void;
}

export default function AttendanceScanner({
  todaySessions,
  manualSessionId,
  onScanSuccess,
}: AttendanceScannerProps) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanState, setScanState] = useState<
    "idle" | "processing" | "success" | "duplicate" | "error" | "offline"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string>(
    "Ready for next student",
  );

  /**
   * Smart Match: Given a student, find which of today's sessions they belong to.
   * Priority: target_students (exact match) > target_grades > global (empty targets).
   * Returns the matched session or null.
   */
  const smartMatchSession = (student: any): TodaySession | null => {
    if (todaySessions.length === 0) return null;
    if (todaySessions.length === 1) return todaySessions[0];

    // 1. Exact student ID match in target_students
    const byStudent = todaySessions.find(s =>
      s.target_students && s.target_students.includes(student.id)
    );
    if (byStudent) return byStudent;

    // 2. Grade batch match in target_grades
    const byGrade = todaySessions.find(s =>
      s.target_grades && s.target_grades.includes(student.grade_batch)
    );
    if (byGrade) return byGrade;

    // 3. Global session (no targets at all)
    const globalSession = todaySessions.find(s =>
      (!s.target_students || s.target_students.length === 0) &&
      (!s.target_grades || s.target_grades.length === 0)
    );
    if (globalSession) return globalSession;

    // 4. No match found — will fall back to manual
    return null;
  };



  const handleScan = async (scannedText: string) => {
    if (scannedText === lastScanned || (!scannedText.startsWith("ICMS-") && !scannedText.startsWith("EVMS-"))) return;

    setLastScanned(scannedText);
    setScanState("processing");
    setStatusMessage("Verifying ID...");

    const scanTimestamp = new Date().toISOString();
    const todayString = scanTimestamp.split("T")[0];

    if (navigator.onLine) {
      try {
        const { data: student, error: fetchError } = await supabase
          .from("students")
          .select("*")
          .eq("qr_code", scannedText)
          .single();
        if (fetchError || !student) throw new Error("Student not found.");

        // --- SMART MATCH ---
        let matchedSession = smartMatchSession(student);

        // Fallback to manual dropdown selection if smart match fails
        if (!matchedSession && manualSessionId) {
          matchedSession = todaySessions.find(s => s.id === manualSessionId) || null;
        }

        // Ultimate fallback: first session
        if (!matchedSession && todaySessions.length > 0) {
          matchedSession = todaySessions[0];
        }

        const sessionStartTime = matchedSession?.start_time || null;
        const matchedScheduleId = matchedSession?.id || null;

        // --- DUPLICATE CHECK (per schedule, not per day) ---
        const startOfDay = `${todayString}T00:00:00.000Z`;
        let isDuplicate = false;

        if (matchedScheduleId) {
          // Check if this student already scanned for THIS specific schedule today
          const { data: existingLogs, error: logCheckError } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("student_id", student.id)
            .eq("schedule_id", matchedScheduleId)
            .gte("scanned_at", startOfDay)
            .limit(1);
          if (logCheckError) throw logCheckError;
          isDuplicate = !!(existingLogs && existingLogs.length > 0);
        } else {
          // No schedule matched — fall back to the old day-level check
          const { data: existingLogs, error: logCheckError } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("student_id", student.id)
            .gte("scanned_at", startOfDay)
            .limit(1);
          if (logCheckError) throw logCheckError;
          isDuplicate = !!(existingLogs && existingLogs.length > 0);
        }

        if (isDuplicate) {
          setScanState("duplicate");
          setStatusMessage("Already Checked In");
          if (onScanSuccess) onScanSuccess(student, false, true);
        } else {
          // --- LOG ATTENDANCE ---
          const logPayload: any = {
            student_id: student.id,
            scanned_at: scanTimestamp,
            status: "present",
          };
          // Attach schedule_id if we matched one
          if (matchedScheduleId) {
            logPayload.schedule_id = matchedScheduleId;
          }

          const { error: logError } = await supabase
            .from("attendance_logs")
            .insert(logPayload);
          if (logError) throw logError;

          // --- LOG XP ---
          await supabase.from("xp_logs").insert({
            student_id: student.id,
            amount: 10,
            reason: "Attendance",
            note: "Checked in via QR Scanner",
          });

          const updatedCycle = (student.cycle_classes || 0) + 1;

          await supabase
            .from("students")
            .update({
              cycle_classes: updatedCycle,
            })
            .eq("id", student.id);

          setScanState("success");
          setStatusMessage(`Welcome, ${student.full_name.split(" ")[0]}!`);

          if (onScanSuccess) {
            onScanSuccess(
              {
                ...student,
                cycle_classes: updatedCycle,
                _matchedSessionTitle: matchedSession?.title || null,
              },
              false,
              false,
            );
          }
        }
      } catch (err: any) {
        if (err.message === "Student not found.") {
          setScanState("error");
          setStatusMessage("Unrecognized ID Card");
        } else {
          await saveLocally(scannedText, scanTimestamp, todayString);
        }
      }
    } else {
      await saveLocally(scannedText, scanTimestamp, todayString);
    }

    setTimeout(() => {
      setLastScanned(null);
      setScanState("idle");
      setStatusMessage("Ready for next student");
    }, 3000);
  };

  const saveLocally = async (
    studentId: string,
    timestamp: string,
    todayString: string,
  ) => {
    try {
      const offlineLogs = await localDB.offlineScans.toArray();
      const alreadyCheckedInOffline = offlineLogs.some(
        (log) =>
          log.student_id === studentId &&
          log.scanned_at.startsWith(todayString),
      );

      if (alreadyCheckedInOffline) {
        setScanState("duplicate");
        setStatusMessage("Already Checked In (Offline)");
        if (onScanSuccess)
          onScanSuccess(
            {
              full_name: "Duplicate Offline Scan",
              grade_batch: studentId,
            },
            true,
            true,
          );
      } else {
        await localDB.offlineScans.add({
          student_id: studentId,
          scanned_at: timestamp,
          status: "present",
        });
        setScanState("offline");
        setStatusMessage("Saved Offline");
        if (onScanSuccess)
          onScanSuccess(
            {
              full_name: "Offline Scan Logged",
              grade_batch: studentId,
            },
            true,
            false,
          );
      }
    } catch (dbError) {
      setScanState("error");
      setStatusMessage("Error saving scan!");
    }
  };

  // No sessions at all — scanner is offline
  if (todaySessions.length === 0) {
    return (
      <div className="w-full aspect-square max-w-sm mx-auto rounded-[2.5rem] bg-slate-100 flex flex-col items-center justify-center border-4 border-dashed border-slate-300 p-8 text-center transition-all">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner text-4xl">
          🗓️
        </div>
        <h3 className="text-2xl font-black text-slate-400 mb-2 uppercase tracking-widest">
          No Class Today
        </h3>
        <p className="text-slate-500 font-medium">
          There is no class scheduled in the system for today.
        </p>
      </div>
    );
  }

  const stateStyles = {
    idle: "border-slate-800 shadow-[0_0_40px_rgba(15,23,42,0.15)] bg-slate-800",
    processing:
      "border-slate-600 shadow-[0_0_40px_rgba(71,85,105,0.3)] bg-slate-600",
    success:
      "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)] bg-emerald-500",
    duplicate:
      "border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.4)] bg-amber-400",
    error: "border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] bg-red-500",
    offline:
      "border-slate-400 shadow-[0_0_40px_rgba(148,163,184,0.4)] bg-slate-400",
  };

  const isMultiSession = todaySessions.length > 1;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center max-w-md mx-auto">
      {/* Status badges row */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${scanState === "idle" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
          ></span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {scanState === "idle" ? "Camera Active" : "Processing"}
          </span>
        </div>
        {isMultiSession && (
          <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-full border border-amber-200">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Smart</span>
          </div>
        )}
      </div>

      {/* Camera viewport */}
      <div
        className={`relative w-full aspect-square rounded-[2rem] overflow-hidden border-[4px] sm:border-[6px] transition-all duration-300 ${stateStyles[scanState].split(" bg-")[0]} bg-slate-900 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:rounded-[1.5rem]`}
        style={{ WebkitTransform: "translateZ(0)", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
      >
        <Scanner
          onScan={(result) => {
            if (result && result.length > 0) handleScan(result[0].rawValue);
          }}
          formats={["qr_code"]}
          components={{ tracker: outline }}
          sound={false}
        />
      </div>

      {/* Status bar */}
      <div className="mt-4 w-full shrink-0">
        <div
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-center text-sm sm:text-base tracking-wide transition-all duration-300 text-white shadow-md ${stateStyles[scanState].split(" ")[2]} ${scanState === "duplicate" || scanState === "error" ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        >
          {statusMessage}
        </div>
        {scanState === "idle" && (
          <p className="text-center text-slate-400 font-medium text-xs mt-3">
            Hold Student ID steady in the frame
          </p>
        )}
      </div>
    </div>
  );
}
