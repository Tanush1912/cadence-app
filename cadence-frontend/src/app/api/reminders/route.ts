import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

const VAPID_PUBLIC = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const VAPID_PRIVATE = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const VAPID_MAILTO = process.env.VAPID_MAILTO || "mailto:hello@cadence.app";

// A blank or malformed key must not break the build: setVapidDetails throws at
// module scope, which fails page-data collection for the whole route.
const urlSafeB64 = /^[A-Za-z0-9_-]+$/;
const pushConfigured =
  urlSafeB64.test(VAPID_PUBLIC) &&
  urlSafeB64.test(VAPID_PRIVATE) &&
  VAPID_PUBLIC.length === 87 &&
  VAPID_PRIVATE.length === 43;

if (pushConfigured) {
  try {
    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch {
    console.warn("[reminders] VAPID keys rejected, push disabled");
  }
} else if (VAPID_PUBLIC || VAPID_PRIVATE) {
  console.warn("[reminders] VAPID keys malformed, push disabled");
}

const subscribers = new Map<string, {
  subscription: webpush.PushSubscription;
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
  lastSent?: string;
}>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "vapid-key") {
    return NextResponse.json({ publicKey: VAPID_PUBLIC });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "subscribe") {
    const { subscription, reminderHour, reminderMinute, timezone, id } = body;
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    const subId = id || subscription.endpoint.slice(-20);
    subscribers.set(subId, {
      subscription,
      reminderHour: reminderHour ?? 20,
      reminderMinute: reminderMinute ?? 0,
      timezone: timezone || "UTC",
    });
    return NextResponse.json({ ok: true, id: subId });
  }

  if (action === "unsubscribe") {
    if (body.id) subscribers.delete(body.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "test") {
    if (!body.subscription || !VAPID_PUBLIC) {
      return NextResponse.json({ error: "No subscription or VAPID keys" }, { status: 400 });
    }
    try {
      await webpush.sendNotification(
        body.subscription,
        JSON.stringify({ title: "Cadence", body: "Reminders are working!", icon: "/icons/icon-192x192.png" })
      );
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
  }

  if (action === "cron") {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    let sent = 0;

    for (const [id, sub] of subscribers) {
      if (sub.lastSent === todayKey) continue;
      if (now.getHours() === sub.reminderHour && now.getMinutes() >= sub.reminderMinute) {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({ title: "Cadence", body: "Have you logged your habits today?", icon: "/icons/icon-192x192.png", tag: "daily-reminder" })
          );
          sub.lastSent = todayKey;
          sent++;
        } catch {
          subscribers.delete(id);
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
