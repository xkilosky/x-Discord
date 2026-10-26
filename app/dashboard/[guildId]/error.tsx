"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GuildError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error", error);
  }, [error]);

  return (
    <div className="panel p-8 text-center">
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-coral/25 bg-coral/12 text-[#ffb3b9]">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-semibold text-white">This view failed to load</h2>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-mist-400">
        Usually a transient Discord API or database hiccup. Retrying is safe — nothing was sent.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10.5px] text-mist-600">ref {error.digest}</p>
      ) : null}
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={reset} className="btn btn-primary !py-2 !text-[13px]">
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </button>
        <Link href="/dashboard" className="btn btn-ghost !py-2 !text-[13px]">
          All servers
        </Link>
      </div>
    </div>
  );
}
