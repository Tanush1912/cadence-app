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
    <div className="flex flex-col h-dvh bg-[#0a0a0a] text-foreground overflow-hidden">
      <main className="flex-1 min-h-0 relative">
        {/* Keep all tabs mounted — hide inactive with CSS to preserve state */}
        <div className={activeTab === "habits" ? "h-full overflow-hidden" : "hidden"}>
          <HabitsPage />
        </div>
        <div className={activeTab === "stats" ? "h-full overflow-y-auto" : "hidden"}>
          <StatsPage />
        </div>
        <div className={activeTab === "system" ? "h-full overflow-y-auto" : "hidden"}>
          <SystemPage />
        </div>
      </main>
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
    </AccentProvider>
  );
}
