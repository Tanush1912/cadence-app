"use client";

import { useState, useCallback } from "react";
import { todayKey } from "@/lib/utils/dates";

export function useSelectedDate() {
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const goToToday = useCallback(() => {
    setSelectedDate(todayKey());
  }, []);

  return { selectedDate, setSelectedDate, goToToday };
}
