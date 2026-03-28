"use client";

import { useState, useEffect } from "react";
import { GunProvider, useGun } from "@/lib/gun/gun-provider";
import { DataProvider } from "@/lib/gun/data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Onboarding } from "@/components/habits/onboarding";

function AppGate() {
  const gun = useGun();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!gun) return;
    gun.get("_meta").get("onboarded").once((val: unknown) => {
      setOnboarded(!!val);
    });
    const timeout = setTimeout(() => {
      setOnboarded((prev) => prev ?? false);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [gun]);

  if (onboarded === null) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function Home() {
  return (
    <GunProvider>
      <AppGate />
    </GunProvider>
  );
}
