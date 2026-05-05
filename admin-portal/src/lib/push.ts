"use server";

import webpush from "web-push";
import { supabase } from "@/lib/supabase";

webpush.setVapidDetails(
  "mailto:admin@icms.edu", 
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

/**
 * Universally dispatches a native push payload to targeting logic.
 * Provide EITHER studentIds OR gradeBatches to filter the audience.
 * If both are empty or undefined, it acts as a Global blast.
 */
export async function dispatchNativePush(
  payloadRaw: { title: string; body: string; url?: string },
  targets?: { studentIds?: string[]; gradeBatches?: string[] }
) {
  try {
    let query = supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth, student_id");

    // We need to resolve the audience based on targets
    if (targets) {
      const idsToTarget = new Set<string>(targets.studentIds || []);
      
      // If targeting grades, we must fetch the student IDs belonging to those grades first
      if (targets.gradeBatches && targets.gradeBatches.length > 0) {
        const { data: studentsInGrade } = await supabase
          .from("students")
          .select("id")
          .in("grade_batch", targets.gradeBatches)
          .eq("is_active", true);
          
        if (studentsInGrade) {
          studentsInGrade.forEach(s => idsToTarget.add(s.id));
        }
      }

      // If we have precise IDs, filter. If neither were provided, it will blast completely globally.
      if (idsToTarget.size > 0) {
        query = query.in("student_id", Array.from(idsToTarget));
      } else if ((targets.studentIds && targets.studentIds.length > 0)) {
         return { success: true, count: 0 };
      }
    }

    const { data: subs, error } = await query;
    if (error || !subs) throw error;

    let successCount = 0;
    const finalPayload = JSON.stringify({
       title: payloadRaw.title,
       body: payloadRaw.body,
       url: payloadRaw.url || "/"
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, finalPayload);
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(`Push Dispatch Error [Client ${sub.id}]:`, err);
        }
      }
    }

    return { success: true, count: successCount };
  } catch (err) {
    console.error("Critical Push Engine Failure:", err);
    return { success: false, error: err };
  }
}
