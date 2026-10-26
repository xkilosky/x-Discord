import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";
import { botRuntime } from "@/lib/bot/runtime";
import { DEMO_MODE, hasBotToken } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = await getRepo();
  const stored = await repo.botStatus();
  const runtime = botRuntime().snapshot();

  return NextResponse.json({
    ...stored,
    demo: DEMO_MODE,
    tokenConfigured: hasBotToken,
    runtime,
  });
}
