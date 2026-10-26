"use client";

import { useActionState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { syncDiscordServer } from "@/app/actions/guild";
import { cn } from "@/lib/utils";

/** Pulls live data from Discord for one guild. */
export function SyncButton({
  guildId,
  label = "Sync from Discord",
  variant = "ghost",
  className,
}: {
  guildId: string;
  label?: string;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const [state, action, pending] = useActionState(syncDiscordServer, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state) toast(state.message, state.ok ? "success" : "error");
  }, [state, toast]);

  return (
    <form action={action} className={cn("contents", className)}>
      <input type="hidden" name="guildId" value={guildId} />
      <button
        type="submit"
        disabled={pending}
        className={cn("btn w-full !py-2 !text-[12.5px]", variant === "primary" ? "btn-primary" : "btn-ghost")}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {pending ? "Syncing…" : label}
      </button>
    </form>
  );
}
