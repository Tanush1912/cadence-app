"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";

/**
 * Subscribe to a GunDB node at the given path.
 * Returns the data and a loading state.
 */
export function useGunNode<T extends Record<string, unknown>>(
  path: string | null
): { data: T | null; loading: boolean } {
  const gun = useGun();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const lastJson = useRef<string>("");

  useEffect(() => {
    if (!gun || !path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const node = path.split("/").reduce((n: ReturnType<typeof gun.get>, segment: string) => n.get(segment), gun);

    const handler = (raw: Record<string, unknown> | null) => {
      if (!raw) {
        setData(null);
        setLoading(false);
        return;
      }
      const cleaned = stripGunMeta(raw) as T;
      const json = JSON.stringify(cleaned);
      if (json !== lastJson.current) {
        lastJson.current = json;
        setData(cleaned);
      }
      setLoading(false);
    };

    node.on(handler);

    return () => {
      node.off();
      lastJson.current = "";
    };
  }, [gun, path]);

  return { data, loading };
}

/**
 * Subscribe to a collection of GunDB nodes (using .map()).
 * Returns a record of key -> value and a loading state.
 */
export function useGunMap<T extends Record<string, unknown>>(
  path: string | null
): { data: Record<string, T>; loading: boolean } {
  const gun = useGun();
  const [data, setData] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState(true);
  const accumulator = useRef<Record<string, T>>({});
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    setData({ ...accumulator.current });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!gun || !path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    accumulator.current = {};

    const node = path.split("/").reduce((n: ReturnType<typeof gun.get>, segment: string) => n.get(segment), gun);

    node.map().on((raw: Record<string, unknown> | null, key: string) => {
      if (!raw) {
        delete accumulator.current[key];
      } else {
        const cleaned = stripGunMeta(raw) as T;
        accumulator.current[key] = cleaned;
      }

      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(flush, 50);
    });

    const timeout = setTimeout(() => setLoading(false), 500);

    return () => {
      node.off();
      clearTimeout(timeout);
      if (updateTimer.current) clearTimeout(updateTimer.current);
      accumulator.current = {};
    };
  }, [gun, path, flush]);

  return { data, loading };
}
