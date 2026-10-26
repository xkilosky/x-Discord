"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Timer } from "lucide-react";
import { runScheduler } from "@/app/actions/guild";
import { useToast } from "@/components/ui/toast";

/**
 * The scheduler tick. In production this is a cron hit against
 * /api/scheduler/tick; keeping it here as a visible heartbeat makes demo mode
 * behave exactly like the live deployment — queued messages actually go out.
 */
export function SchedulerHeartbeat() {
  const [seconds, setSeconds] = useState(0);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const tick = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await runScheduler();
        if (result.delivered > 0) {
          toast(`Scheduler delivered ${result.delivered} queued message(s).`, "success");
        }
        if (result.failed > 0) {
          toast(`${result.failed} message(s) failed to deliver.`, "error");
        }
      } catch {
        // offline / demo teardown — retry on the next tick
      }
      setSeconds(0);
    });
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (seconds > 0 && seconds % 25 === 0) tick();
  }, [seconds, tick]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-[11px] text-mist-400">
      {pending ? <Loader2 className="h-3 w-3 animate-spin text-violet" /> : <Timer className="h-3 w-3 text-mint" />}
      scheduler {pending ? "checking…" : `tick in ${25 - (seconds % 25)}s`}
    </span>
  );
}
