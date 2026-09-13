import { Hono } from "hono";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO ?? "mailto:cadence@localhost";

// Fail loudly rather than falling back to a literal: a committed default leaked the last pair.
export const pushConfigured = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

if (pushConfigured) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC!, VAPID_PRIVATE!);
} else {
  console.warn("[reminders] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY unset, push disabled");
}

interface ReminderSubscription {
  subscription: webpush.PushSubscription;
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
  lastSent?: string;
}

const subscribers = new Map<string, ReminderSubscription>();

const app = new Hono();

app.get("/vapid-key", (c) => {
  return c.json({ publicKey: VAPID_PUBLIC });
});

app.post("/subscribe", async (c) => {
  try {
    const body = await c.req.json();
    const { subscription, reminderHour, reminderMinute, timezone, id } = body;

    if (!subscription || !subscription.endpoint) {
      return c.json({ error: "Invalid push subscription" }, 400);
    }

    const subId = id || subscription.endpoint.slice(-20);
    subscribers.set(subId, {
      subscription,
      reminderHour: reminderHour ?? 20,
      reminderMinute: reminderMinute ?? 0,
      timezone: timezone || "UTC",
      lastSent: undefined,
    });

    return c.json({ ok: true, id: subId });
  } catch (err) {
    return c.json({ error: "Failed to subscribe" }, 400);
  }
});

app.post("/unsubscribe", async (c) => {
  try {
    const { id } = await c.req.json();
    if (id) subscribers.delete(id);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Failed to unsubscribe" }, 400);
  }
});

app.post("/test", async (c) => {
  try {
    const { subscription } = await c.req.json();
    if (!subscription) return c.json({ error: "No subscription" }, 400);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Cadence",
        body: "Reminders are working! You'll get a daily nudge.",
        icon: "/icons/icon-192x192.png",
      })
    );

    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: "Failed to send test notification" }, 500);
  }
});

export async function checkAndSendReminders() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (const [id, sub] of subscribers) {
    if (sub.lastSent === todayKey) continue;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour === sub.reminderHour && currentMinute >= sub.reminderMinute) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: "Cadence",
            body: "Have you logged your habits today?",
            icon: "/icons/icon-192x192.png",
            tag: "daily-reminder",
          })
        );
        sub.lastSent = todayKey;
        console.log(`Reminder sent to ${id}`);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            subscribers.delete(id);
            console.log(`Removed expired subscription ${id}`);
          }
        }
      }
    }
  }
}

export default app;
