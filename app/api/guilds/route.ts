import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Servers the signed-in user can manage. Used by the command palette + CLI. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guilds = await getRepo().then((r) => r.listGuilds());
  return NextResponse.json({
    count: guilds.length,
    guilds: guilds.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.memberCount,
      botInstalled: g.botInstalled,
      role: g.viewerRole,
    })),
  });
}
