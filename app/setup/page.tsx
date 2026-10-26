import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDashed,
  ExternalLink,
  KeyRound,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProviderStatus } from "@/lib/oauth-status";
import { DEMO_MODE, hasBotToken, serverEnv, supabaseConfigured } from "@/lib/env";
import { startDemo } from "@/app/actions/auth";

export const metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

type Check = {
  key: string;
  label: string;
  detail: string;
  ok: boolean;
  required: boolean;
  fix?: string;
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const providers = await getProviderStatus();

  const projectRef = serverEnv.supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
  const supabaseCallback = projectRef
    ? `https://${projectRef}.supabase.co/auth/v1/callback`
    : "https://<project-ref>.supabase.co/auth/v1/callback";
  const appCallback = `${serverEnv.appUrl}/auth/callback`;

  const checks: Check[] = [
    {
      key: "supabase",
      label: "Supabase project connected",
      detail: supabaseConfigured
        ? "URL and anon key are present in the runtime environment."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      ok: supabaseConfigured,
      required: true,
      fix: "Create a project at supabase.com, then copy the URL and anon key from Project settings → API.",
    },
    {
      key: "serviceRole",
      label: "Service role key set",
      detail: serverEnv.serviceRoleKey
        ? "The bot, scheduler and guild sync can write to Postgres."
        : "Required for scheduled sends, guild sync and moderation writes.",
      ok: Boolean(serverEnv.serviceRoleKey),
      required: true,
      fix: "Add SUPABASE_SERVICE_ROLE_KEY (Project settings → API). Server-side only — never expose it.",
    },
    {
      key: "discord",
      label: "Discord OAuth provider enabled",
      detail: providers.discord
        ? "Supabase will accept Discord sign-ins."
        : providers.checked
          ? "Supabase reports the Discord provider is off, so sign-in would fail."
          : `Could not check the provider${providers.error ? ` (${providers.error})` : ""}.`,
      ok: providers.discord,
      required: true,
      fix: "In Supabase → Authentication → Providers → Discord, paste your Discord Client ID and Client Secret, then enable it.",
    },
    {
      key: "bot",
      label: "Discord bot token set",
      detail: hasBotToken
        ? "The gateway and REST calls can authenticate as the bot."
        : "Without it the dashboard works, but nothing can be sent to a real channel.",
      ok: hasBotToken,
      required: false,
      fix: "Add DISCORD_BOT_TOKEN from the Discord developer portal → Bot → Reset Token.",
    },
  ];

  const ready = checks.filter((c) => c.required).every((c) => c.ok);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[13px] font-medium text-mist-400 transition hover:text-white">
          ← x-Discord
        </Link>
        <Badge tone={DEMO_MODE ? "violet" : ready ? "mint" : "amber"} dot>
          {DEMO_MODE ? "demo mode" : ready ? "live & ready" : "setup required"}
        </Badge>
      </div>

      <div className="mt-6">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white">Finish connecting Discord</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-mist-400">
          {ready
            ? "Everything required is configured. Sign in with Discord and your servers will appear."
            : "The dashboard is deployed, but the live Discord connection still needs credentials. Nothing here is broken — these are the remaining steps."}
        </p>
      </div>

      {reason ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber/30 bg-amber/8 p-3 text-[12.5px] text-[#f7d394]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {reason === "provider"
            ? "Sign-in was blocked because the Discord provider is not enabled in Supabase yet."
            : "Discord sign-in could not be started — check the credentials and try again."}
        </p>
      ) : null}

      <section className="panel mt-6 divide-y divide-white/6">
        {checks.map((check) => (
          <div key={check.key} className="flex items-start gap-3 p-4">
            <span
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                check.ok ? "bg-mint/12 text-mint" : "bg-amber/12 text-amber"
              }`}
            >
              {check.ok ? <Check className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-medium text-white">{check.label}</p>
                {!check.required ? (
                  <Badge tone="neutral">optional</Badge>
                ) : check.ok ? null : (
                  <Badge tone="amber">blocking</Badge>
                )}
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">{check.detail}</p>
              {!check.ok && check.fix ? (
                <p className="mt-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] leading-relaxed text-mist-300">
                  {check.fix}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-violet" />
          <h2 className="text-[13.5px] font-semibold text-white">URLs to paste into Discord</h2>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-mist-400">
          Discord only accepts redirect URLs that match exactly. Add both:
        </p>
        <div className="mt-2.5 space-y-2">
          {[
            { label: "Supabase OAuth callback (required in Discord)", value: supabaseCallback },
            { label: "App callback (fallback / direct flow)", value: appCallback },
          ].map((row) => (
            <div key={row.label} className="rounded-lg border border-white/7 bg-ink-850 p-2.5">
              <p className="text-[10.5px] uppercase tracking-wide text-mist-500">{row.label}</p>
              <p className="mt-0.5 break-all font-mono text-[12px] text-mist-200">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href="https://discord.com/developers/applications"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost !py-1.5 !text-[12px]"
          >
            Discord developer portal <ExternalLink className="h-3 w-3" />
          </a>
          <Link href="/api/health" className="btn btn-ghost !py-1.5 !text-[12px]">
            <ShieldCheck className="h-3 w-3" /> Health JSON
          </Link>
        </div>
      </section>

      <section className="panel mt-4 p-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-violet" />
          <h2 className="text-[13.5px] font-semibold text-white">Database schema</h2>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-mist-400">
          Run <span className="font-mono text-mist-200">supabase/schema.sql</span> in the Supabase SQL
          editor once. It creates the tables, indexes and row-level security policies that scope every
          row to a guild you administer.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {ready ? (
          <Link href="/" className="btn btn-primary !py-2.5 !text-[13px]">
            Sign in with Discord <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <form action={startDemo}>
          <button type="submit" className="btn btn-ghost !py-2.5 !text-[13px]">
            Explore the demo dataset
          </button>
        </form>
        <Link href="/api/health" className="ml-auto text-[11.5px] text-mist-500 transition hover:text-mist-200">
          view readiness →
        </Link>
      </div>
    </div>
  );
}
