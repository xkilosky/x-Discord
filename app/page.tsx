import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Command,
  Hash,
  KeyRound,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { DEMO_MODE, botInviteUrl } from "@/lib/env";
import { getProviderStatus } from "@/lib/oauth-status";
import { signInWithDiscord, startDemo } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: KeyRound,
    title: "Connect Discord once",
    body: "A single OAuth handshake links your account. No tokens to paste, no bot sprawl — the dashboard remembers every server you manage.",
  },
  {
    icon: Layers,
    title: "Every server in one rail",
    body: "Switch between communities instantly. Pinned servers, live member counts and a ⌘K jump bar keep you two keystrokes from anywhere.",
  },
  {
    icon: CalendarClock,
    title: "Messages that land on time",
    body: "Compose once, pick the channel, schedule the send. Embeds, previews and a delivery log so you know exactly what went out.",
  },
  {
    icon: ShieldCheck,
    title: "AutoMod without SQL",
    body: "Toggle spam, invite, link, caps and mention protection. Tune thresholds with a slider and see what fired in the last 24 hours.",
  },
  {
    icon: Bot,
    title: "One bot, many servers",
    body: "Install the bot from any server card. It registers slash commands, posts your scheduled messages and reports health back here.",
  },
  {
    icon: Command,
    title: "Commands you can edit",
    body: "Every slash command exposes its response, permissions and usage. Change behaviour from the dashboard, deploy in seconds.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Authorize once",
    body: "Sign in with Discord and approve the identify + guilds scopes. That is the only time you will see a consent screen.",
  },
  {
    step: "02",
    title: "Pick your servers",
    body: "The dashboard lists every server where you have Manage Server. Invite the bot to the ones you want to control.",
  },
  {
    step: "03",
    title: "Run the room",
    body: "Post announcements, schedule drops, tighten AutoMod, review moderation — all from one place, on any device.",
  },
];

function HeroPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-gradient-to-tr from-violet/20 via-transparent to-cyan/15 blur-2xl" />
      <div className="panel relative overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-white/7 px-3.5 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-coral/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-mint/70" />
          <span className="ml-3 font-mono text-[10px] text-mist-500">x-discord.app/dashboard</span>
          <Badge tone="mint" dot className="ml-auto">
            bot online
          </Badge>
        </div>

        <div className="grid gap-3 p-3.5 sm:grid-cols-[132px_1fr]">
          <div className="hidden flex-col gap-1.5 sm:flex">
            {[
              { icon: Zap, label: "Overview", active: true },
              { icon: Hash, label: "Messages" },
              { icon: ShieldCheck, label: "AutoMod" },
              { icon: Bot, label: "Commands" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                    item.active ? "bg-violet/16 text-white" : "text-mist-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              );
            })}
            <div className="mt-auto rounded-lg border border-white/8 bg-white/[0.03] p-2">
              <p className="text-[9px] uppercase tracking-wider text-mist-500">Latency</p>
              <p className="font-mono text-[11px] text-mint">42ms</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Servers", value: "4", tone: "text-white" },
                { label: "Scheduled", value: "3", tone: "text-[#c9c0ff]" },
                { label: "AutoMod hits", value: "87", tone: "text-[#9df0c9]" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-white/7 bg-white/[0.03] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-mist-500">{s.label}</p>
                  <p className={`mt-0.5 text-lg font-semibold leading-none ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/8 bg-ink-850 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mist-400">
                  Compose
                </p>
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-mist-400">
                  #announcements
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist-200">
                Patch 0.9.4 is live — new lighting pass, controller remap and 31 fixes.{" "}
                <span className="text-mist-500">Full notes in the thread.</span>
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="rounded-md bg-violet/20 px-1.5 py-0.5 text-[9px] font-medium text-[#c9c0ff]">
                  Schedule · 2d
                </span>
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-mist-400">
                  Embed on
                </span>
                <span className="ml-auto rounded-md bg-gradient-to-b from-[#7b6bff] to-[#5b57f0] px-2 py-0.5 text-[9px] font-semibold text-white">
                  Send
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {[
                { name: "Pixel Forge", meta: "12.8k members", color: "#7c5cff", live: true },
                { name: "Apex Circuit", meta: "28.9k members", color: "#ff5d6c", live: true },
                { name: "Late Night Lounge", meta: "3.2k members", color: "#22d3ee", live: false },
              ].map((g) => (
                <div
                  key={g.name}
                  className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5"
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-semibold text-white"
                    style={{ background: `linear-gradient(145deg, ${g.color}, #16182a)` }}
                  >
                    {g.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-[11px] text-mist-200">{g.name}</span>
                  <span className="text-[9px] text-mist-500">{g.meta}</span>
                  {g.live ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  // On a live deployment we check whether Discord sign-in can actually work,
  // so the primary CTA never leads to a broken OAuth screen.
  const providers = DEMO_MODE ? null : await getProviderStatus();
  const needsSetup = !DEMO_MODE && !providers?.discord;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-ink-900/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#8b7bff] via-[#6a5cff] to-[#4a45e0] shadow-lg shadow-violet/30">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="currentColor" aria-hidden>
                <path d="M9.2 6.1a1 1 0 0 1 .9-.6h3.8a1 1 0 0 1 .9.6l3.6 8.4a1 1 0 0 1-.1 1l-2.3 2.9a1 1 0 0 1-.8.4h-6.4a1 1 0 0 1-.8-.4l-2.3-2.9a1 1 0 0 1-.1-1l3.6-8.4Z" />
                <circle cx="14.4" cy="12" r="1.4" fill="#3b35c9" />
                <circle cx="9.6" cy="12" r="1.4" fill="#3b35c9" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">x-Discord</span>
          </Link>

          <nav className="hidden items-center gap-6 text-[13px] text-mist-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#security" className="transition hover:text-white">
              Security
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-ghost !py-2 !text-[13px]">
              Open dashboard
            </Link>
            {needsSetup ? (
              <Link href="/setup" className="btn btn-primary !py-2 !text-[13px]">
                Finish setup
              </Link>
            ) : (
              <form action={signInWithDiscord}>
                <button type="submit" className="btn btn-primary !py-2 !text-[13px]">
                  Sign in with Discord
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
            <div className="animate-rise">
              <span className="chip border-violet/30 bg-violet/12 text-[#d6ceff]">
                <Sparkles className="h-3 w-3" />
                {needsSetup ? "Deployed · Discord setup pending" : "One OAuth connection · every server"}
              </span>

              <h1 className="mt-5 text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[3.4rem]">
                Your Discord server,
                <br />
                with a real{" "}
                <span className="bg-gradient-to-r from-[#a99bff] via-[#7c5cff] to-[#22d3ee] bg-clip-text text-transparent">
                  control room
                </span>
                .
              </h1>

              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mist-400">
                Connect your Discord account once. Then add bots, choose exactly which channel each
                message lands in, schedule announcements and lock down AutoMod — from one dashboard
                that loads faster than the Discord client.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {needsSetup ? (
                  <Link href="/setup" className="btn btn-primary !px-5 !py-3 !text-sm">
                    <KeyRound className="h-4 w-4" /> Finish Discord setup
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <form action={signInWithDiscord}>
                    <button type="submit" className="btn btn-primary !px-5 !py-3 !text-sm">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.3.7a14 14 0 0 1 4.1 1.4 13.4 13.4 0 0 0-11-.5l-.6.5A14 14 0 0 1 8.7 3.7L8.4 3a19 19 0 0 0-4.7 1.5C1.1 8.4.5 12.2.8 16a19 19 0 0 0 5.8 3l.7-1.3a12 12 0 0 1-1.9-.9l.5-.4a13.5 13.5 0 0 0 11.6 0l.5.4c-.6.4-1.2.7-1.9.9l.7 1.3a19 19 0 0 0 5.8-3c.4-4.5-.6-8.3-3.3-11.5ZM8.6 14c-.8 0-1.4-.8-1.4-1.7 0-1 .6-1.7 1.4-1.7.9 0 1.5.8 1.4 1.7 0 1-.6 1.7-1.4 1.7Zm6.4 0c-.8 0-1.4-.8-1.4-1.7 0-1 .6-1.7 1.4-1.7.9 0 1.5.8 1.4 1.7 0 1-.6 1.7-1.4 1.7Z" />
                      </svg>
                      Connect Discord
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
                <a href="#features" className="btn btn-ghost !px-4 !py-3 !text-sm">
                  See what&apos;s inside
                </a>
              </div>

              <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/7 pt-5">
                {[
                  ["1", "OAuth handshake"],
                  ["7", "AutoMod filters"],
                  ["0", "Tokens to paste"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-2xl font-semibold tracking-tight text-white">{value}</dt>
                    <dd className="mt-0.5 text-[11px] uppercase tracking-wide text-mist-500">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-white/6 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet">
                The control deck
              </p>
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                Everything you open Discord for, but built for doing it fast.
              </h2>
              <p className="mt-3 text-[15px] text-mist-400">
                Designed around the jobs server owners actually repeat: post, schedule, filter, review,
                repeat.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <article key={f.title} className="panel panel-hover p-5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet/25 bg-violet/12 text-[#c9c0ff]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-3.5 text-[15px] font-semibold text-white">{f.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">{f.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-white/6 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan">Setup</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                  Three steps, one of them is a button.
                </h2>
              </div>
              <Badge tone="violet">
                <Zap className="h-3 w-3" /> under 2 minutes
              </Badge>
            </div>

            <ol className="mt-9 grid gap-3 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.step} className="panel p-5">
                  <span className="font-mono text-[11px] text-violet">{s.step}</span>
                  <h3 className="mt-2 text-[15px] font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-t border-white/6 py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint">Security</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                You keep the keys. We keep them out of the browser.
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mist-400">
                The dashboard never handles your Discord password. Bot tokens stay server-side, every
                query is scoped to servers you actually administer, and the ledger of actions is
                append-only.
              </p>
              <a
                href={botInviteUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost mt-6 !text-[13px]"
              >
                <Bot className="h-4 w-4" /> Preview the bot invite
              </a>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[
                ["OAuth scopes only", "identify + guilds. Nothing else is requested."],
                ["Row-level security", "Postgres policies tie every row to a guild you manage."],
                ["Server-side tokens", "The bot token never reaches a browser bundle."],
                ["Full audit trail", "AutoMod hits and manual actions are logged, not overwritten."],
              ].map(([title, body]) => (
                <li key={title} className="panel-flat p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                    <p className="text-[13px] font-semibold text-white">{title}</p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-mist-400">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-violet/25 bg-gradient-to-br from-violet/18 via-ink-800 to-ink-800 px-6 py-12 text-center sm:px-12">
            <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-violet/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan/15 blur-3xl" />
            <h2 className="relative text-balance text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
              Take the back office out of Discord.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-mist-300">
              {DEMO_MODE
                ? "This build runs on a full demo dataset — sign in and every screen, schedule and toggle is live and editable."
                : "Connect your Discord account and your servers appear in seconds."}
            </p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-2">
              {needsSetup ? (
                <Link href="/setup" className="btn btn-primary !px-6 !py-3 !text-sm">
                  Finish setup <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <form action={signInWithDiscord}>
                  <button type="submit" className="btn btn-primary !px-6 !py-3 !text-sm">
                    Connect Discord <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
              <form action={startDemo}>
                <button type="submit" className="btn btn-ghost !px-5 !py-3 !text-sm">
                  Explore the demo
                </button>
              </form>
            </div>
            {DEMO_MODE ? (
              <p className="relative mt-3 text-[11px] text-mist-500">
                Demo mode is on — no Discord credentials required.
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12px] text-mist-500">
          <span>© {new Date().getFullYear()} x-Discord. Not affiliated with Discord Inc.</span>
          <span className="flex items-center gap-4">
            <Link href="/dashboard" className="transition hover:text-mist-200">
              Dashboard
            </Link>
            <a href="#features" className="transition hover:text-mist-200">
              Features
            </a>
            <span className="font-mono">v0.1</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
