import { NextResponse } from "next/server";
import { runScheduler } from "@/app/actions/guild";

export const dynamic = "force-dynamic";

/**
 * Cron entry point for scheduled messages.
 *
 * Vercel: add a cron in vercel.json hitting this every minute.
 * Anywhere else: curl it from a systemd timer / GitHub Action.
 * Protect it with CRON_SECRET so nobody can force early sends.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runScheduler();
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "scheduler failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
