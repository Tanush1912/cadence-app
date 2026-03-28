"use client";

import { useState } from "react";
import { BottomTabs, type TabId } from "./bottom-tabs";
import { AccentProvider } from "./accent-provider";
import { HabitsPage } from "@/components/habits/habits-page";
import { StatsPage } from "@/components/stats/stats-page";
import { SystemPage } from "@/components/system/system-page";

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("habits");

  return (
    <AccentProvider>
    <div className="fixed inset-0 bg-[#0a0a0a] text-foreground">
      {/* Main content — full screen, nav floats on top */}
      <div className={activeTab === "habits" ? "h-full overflow-hidden" : "hidden"}>
        <HabitsPage />
      </div>
      <div className={activeTab === "stats" ? "h-full overflow-y-auto" : "hidden"}>
        <StatsPage />
      </div>
      <div className={activeTab === "system" ? "h-full overflow-y-auto" : "hidden"}>
        <SystemPage />
      </div>
      {/* Floating nav — fixed position, not in flex flow */}
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
    </AccentProvider>
  );
}
