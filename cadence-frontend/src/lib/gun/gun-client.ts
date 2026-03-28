"use client";

import Gun from "gun/gun";
import "gun/lib/radix";
import "gun/lib/radisk";
import "gun/lib/store";
import "gun/lib/rindexed";

type GunInstance = ReturnType<typeof Gun>;

let gunInstance: GunInstance | null = null;

const RELAY_URL =
  process.env.NEXT_PUBLIC_GUN_RELAY ?? "http://localhost:3001/gun";

export function getGun(): GunInstance | null {
  if (typeof window === "undefined") return null;
  if (!gunInstance) {
    gunInstance = Gun({
      peers: [RELAY_URL],
      localStorage: false, // we use IndexedDB via rindexed instead
      file: "cadence-db",  // IndexedDB database name (used by rindexed in browser)
    });
  }
  return gunInstance;
}
