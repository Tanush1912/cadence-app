"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta, generateId } from "@/lib/gun/gun-utils";

export interface Bundle {
  id: string;
  name: string;
  habitIds: string;
  createdAt: number;
}

const MAX_BUNDLES = 3;

export function useBundles() {
  const gun = useGun();
  const [bundles, setBundles] = useState<Record<string, Bundle>>({});
  const [loading, setLoading] = useState(true);
  const accumulator = useRef<Record<string, Bundle>>({});
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gun) {
      setLoading(false);
      return;
    }

    setLoading(true);
    accumulator.current = {};

    const node = gun.get("bundles");

    node.map().on((raw: Record<string, unknown> | null, bundleId: string) => {
      if (!raw) {
        delete accumulator.current[bundleId];
      } else {
        const cleaned = stripGunMeta(raw);
        if (!cleaned.name) {
          delete accumulator.current[bundleId];
        } else {
          accumulator.current[bundleId] = {
            id: bundleId,
            name: cleaned.name as string,
            habitIds: (cleaned.habitIds as string) ?? "",
            createdAt: (cleaned.createdAt as number) ?? 0,
          };
        }
      }

      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        setBundles({ ...accumulator.current });
        setLoading(false);
      }, 50);
    });

    const timeout = setTimeout(() => setLoading(false), 500);

    return () => {
      node.off();
      clearTimeout(timeout);
      if (updateTimer.current) clearTimeout(updateTimer.current);
      accumulator.current = {};
    };
  }, [gun]);

  const createBundle = useCallback(
    (name: string, habitIds: string[]) => {
      if (!gun) return;

      const currentCount = Object.keys(bundles).length;
      if (currentCount >= MAX_BUNDLES) return;

      const id = generateId();
      const bundle = {
        name,
        habitIds: habitIds.join(","),
        createdAt: Date.now(),
      };

      gun.get("bundles").get(id).put(bundle);

      accumulator.current[id] = { ...bundle, id };
      setBundles({ ...accumulator.current });
    },
    [gun, bundles]
  );

  const deleteBundle = useCallback(
    (id: string) => {
      if (!gun) return;

      gun.get("bundles").get(id).put({
        name: null,
        habitIds: null,
        createdAt: null,
      });

      delete accumulator.current[id];
      setBundles({ ...accumulator.current });
    },
    [gun]
  );

  return { bundles, createBundle, deleteBundle, loading };
}
