/**
 * サーバー起動時に一度だけ呼ばれる（Next.js の instrumentation）。
 * Node.js のランタイムでだけ、バックグラウンド処理のワーカーを起動する（T022）。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorkers } = await import("@/server/jobs");
    await startWorkers().catch((error) => console.error("failed to start workers", error));
  }
}
