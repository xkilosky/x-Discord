/**
 * Next.js runs this once when the server process boots. We use it to bring up
 * the Discord gateway in the same deployment as the dashboard, so there is a
 * single thing to deploy.
 *
 * Set BOT_DISABLED=1 on serverless hosts that cannot hold a socket open.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootBot } = await import("@/lib/bot/runtime");
  await bootBot();
}
