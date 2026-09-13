"use client";

import Gun from "gun/gun";
import "gun/lib/radix";
import "gun/lib/radisk";
import "gun/lib/store";
import "gun/lib/rindexed";

type GunInstance = ReturnType<typeof Gun>;

let gunInstance: GunInstance | null = null;

// No relay configured means local-only, which is the normal case. Defaulting to
// a peer nobody is running makes every session retry a connection that cannot open.
const RELAY_URL = process.env.NEXT_PUBLIC_GUN_RELAY?.trim();

export function getGun(): GunInstance | null {
  if (typeof window === "undefined") return null;
  if (!gunInstance) {
    gunInstance = Gun({
      peers: RELAY_URL ? [RELAY_URL] : [],
      localStorage: false, // we use IndexedDB via rindexed instead
      file: "cadence-db",  // IndexedDB database name (used by rindexed in browser)
    });
  }
  return gunInstance;
}
