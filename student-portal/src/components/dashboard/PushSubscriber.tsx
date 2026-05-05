"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BellRing, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscriber() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Check quietly if we already have permission. If we do, just sync the token invisibly.
    // If it's 'default', we need to show the physical button to strictly comply with iOS Safari rules.
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Show our custom UI Banner
        setShowPrompt(true);
      } else if (Notification.permission === "granted") {
        // We already have permission, stealth subscribe/sync in background!
        setupPush(true);
      }
    }
  }, []);

  async function setupPush(silent = false) {
    try {
      if (!silent) setIsSubscribing(true);

      const activeStudentId = localStorage.getItem("icms_active_student");
      if (!activeStudentId) return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      
      // Explicitly register the Service Worker to avoid deadlocking on Android Chrome
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission natively (Requires active User Gesture on iOS)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShowPrompt(false);
        return;
      }

      const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC) {
        console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env");
        return;
      }

      // Sync physical token
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
        });
      }

      const subData = subscription.toJSON();
      if (subData.keys) {
        await supabase.from("push_subscriptions").upsert({
          student_id: activeStudentId,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth,
          user_agent: navigator.userAgent
        }, { onConflict: "student_id, endpoint" });
      }

      setShowPrompt(false);
    } catch (err) {
      console.error("Failed to subscribe to push", err);
    } finally {
      if (!silent) setIsSubscribing(false);
    }
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg leading-tight mb-1">Stay Updated!</h3>
            <p className="text-sm font-medium text-slate-400 mb-4 leading-snug">
              Allow notifications to receive instant alerts for classes, homework, and XP drops! 🚀
            </p>
            <button 
              onClick={() => setupPush(false)}
              disabled={isSubscribing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isSubscribing ? "Activating..." : "Enable Notifications"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
