"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGun } from "@/lib/gun/gun-provider";

interface ReminderState {
  enabled: boolean;
  hour: number;
  minute: number;
  permissionGranted: boolean;
  subscriptionId: string | null;
  loading: boolean;
}

export function useReminders() {
  const gun = useGun();
  const [state, setState] = useState<ReminderState>({
    enabled: false,
    hour: 20,
    minute: 0,
    permissionGranted: false,
    subscriptionId: null,
    loading: true,
  });
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!gun) return;
    gun.get("profile").get("reminder").once((data: Record<string, unknown> | null) => {
      if (data) {
        setState((prev) => ({
          ...prev,
          enabled: !!data.enabled,
          hour: (data.hour as number) ?? 20,
          minute: (data.minute as number) ?? 0,
          subscriptionId: (data.subscriptionId as string) ?? null,
          loading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });
  }, [gun]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setState((prev) => ({ ...prev, permissionGranted: Notification.permission === "granted" }));
  }, []);

  const isSupported = typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const enableReminders = useCallback(async (hour: number, minute: number) => {
    if (!isSupported || !gun) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState((prev) => ({ ...prev, permissionGranted: false }));
      return;
    }
    setState((prev) => ({ ...prev, permissionGranted: true }));

    try {
      let registration = registrationRef.current;
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw-push.js");
        registrationRef.current = registration;
        await navigator.serviceWorker.ready;
      }

      const vapidRes = await fetch("/api/reminders?action=vapid-key");
      if (!vapidRes.ok) throw new Error("Could not get push key");
      const { publicKey } = await vapidRes.json();
      if (!publicKey) throw new Error("Push notifications not configured on server");

      const pushSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          subscription: pushSub.toJSON(),
          reminderHour: hour,
          reminderMinute: minute,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await res.json();

      gun.get("profile").get("reminder").put({
        enabled: true,
        hour,
        minute,
        subscriptionId: data.id || null,
      });

      setState((prev) => ({
        ...prev, enabled: true, hour, minute, subscriptionId: data.id || null,
      }));
    } catch (err) {
      console.error("Failed to enable reminders:", err);
    }
  }, [isSupported, gun]);

  const disableReminders = useCallback(async () => {
    if (!gun) return;

    if (state.subscriptionId) {
      try {
        await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", id: state.subscriptionId }),
        });
      } catch { /* ignore */ }
    }

    if (registrationRef.current) {
      const sub = await registrationRef.current.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }

    gun.get("profile").get("reminder").put({
      enabled: false, hour: state.hour, minute: state.minute, subscriptionId: null,
    });

    setState((prev) => ({ ...prev, enabled: false, subscriptionId: null }));
  }, [gun, state.subscriptionId, state.hour, state.minute]);

  const testNotification = useCallback(async () => {
    if (!registrationRef.current) return;
    const sub = await registrationRef.current.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", subscription: sub.toJSON() }),
    });
  }, []);

  return { ...state, isSupported, enableReminders, disableReminders, testNotification };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
