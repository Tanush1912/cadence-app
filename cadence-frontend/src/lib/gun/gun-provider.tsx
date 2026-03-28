"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { GunInstance } from "./types";

const GunContext = createContext<GunInstance | null>(null);

export function GunProvider({ children }: { children: ReactNode }) {
  const [gun, setGun] = useState<GunInstance | null>(null);

  useEffect(() => {
    import("./gun-client").then(({ getGun }) => {
      const instance = getGun();
      setGun(instance as GunInstance | null);
    });
  }, []);

  return <GunContext.Provider value={gun}>{children}</GunContext.Provider>;
}

export function useGun(): GunInstance | null {
  return useContext(GunContext);
}
