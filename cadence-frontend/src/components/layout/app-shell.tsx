"use client";

import { useState } from "react";
import { BottomTabs, type TabId } from "./bottom-tabs";
import { AccentProvider } from "./accent-provider";
import { HabitsPage } from "@/components/habits/habits-page";
import { StatsPage } from "@/components/stats/stats-page";
import { SystemPage } from "@/components/system/system-page";
import { ReflectionDrawer } from "@/components/habits/reflection-drawer";
import { useProfile } from "@/lib/hooks/use-profile";

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("habits");
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const { profile } = useProfile();

  return (
    <AccentProvider>
    <div className="fixed inset-0 bg-[#0a0a0a] text-foreground">
      <div className={activeTab === "habits" ? "h-full overflow-hidden" : "hidden"}>
        <HabitsPage />
      </div>
      <div className={activeTab === "stats" ? "h-full overflow-y-auto" : "hidden"}>
        <StatsPage onReflect={() => setReflectionOpen(true)} />
      </div>
      <div className={activeTab === "system" ? "h-full overflow-y-auto" : "hidden"}>
        <SystemPage />
      </div>
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <ReflectionDrawer
        open={reflectionOpen}
        onOpenChange={setReflectionOpen}
        weekSummary={null}
        apiKey={profile.aiKey}
      />
    </div>
    </AccentProvider>
  );
}
