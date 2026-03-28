"use client";

import Gun from "gun/gun";

type GunInstance = ReturnType<typeof Gun>;

let gunInstance: GunInstance | null = null;

export function getGun(): GunInstance | null {
  if (typeof window === "undefined") return null;
  if (!gunInstance) {
    gunInstance = Gun({
      peers: [],
      file: "cadence-db",
    });
  }
  return gunInstance;
}
