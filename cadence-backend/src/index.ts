import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import transcribe from "./routes/transcribe.js";
import checkin from "./routes/checkin.js";
import reminders, { checkAndSendReminders } from "./routes/reminders.js";

const app = new Hono();

const ALLOWED_ORIGINS = (origin: string): string | null | undefined => {
  if (!origin) return origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) return origin;
  if (/^https?:\/\/192\.168\.\d+\.\d+/.test(origin)) return origin;
  if (/^https?:\/\/10\.\d+\.\d+\.\d+/.test(origin)) return origin;
  return null;
};

app.use(
  "/api/*",
  cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api/transcribe", transcribe);
app.route("/api/checkin", checkin);
app.route("/api/reminders", reminders);


app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

cron.schedule("* * * * *", () => {
  checkAndSendReminders().catch(console.error);
});

const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`Cadence backend running on http://localhost:${port}`);

const server = serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0", // Accept connections from LAN (phone on same WiFi)
});

// Gun relay — attaches WebSocket server to the same HTTP server.
// Data persists to disk in ./cadence-relay-data via Radisk.
// Frontend peers connect to ws://localhost:3001/gun for sync.
import Gun from "gun";
Gun({ web: server, file: "cadence-relay-data" });
console.log("Gun relay active on ws://0.0.0.0:" + port + "/gun");

export default app;
