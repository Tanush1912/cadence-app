"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FRICTION_TIMEOUT_MS } from "@/lib/constants";
import type { FrictionScore } from "@/lib/types";

type FrictionState = "idle" | "showing" | "committed";

export function useFriction(
  onCommit: (score: FrictionScore) => void
) {
  const [state, setState] = useState<FrictionState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveAutoRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    cleanup();

    if (consecutiveAutoRef.current >= 3) {
      onCommit(null);
      setState("committed");
      return;
    }

    setState("showing");

    timerRef.current = setTimeout(() => {
      consecutiveAutoRef.current++;
      onCommit(null);
      setState("committed");
    }, FRICTION_TIMEOUT_MS);
  }, [cleanup, onCommit]);

  const commit = useCallback(
    (score: 1 | 2 | 3) => {
      cleanup();
      consecutiveAutoRef.current = 0;
      onCommit(score);
      setState("committed");
    },
    [cleanup, onCommit]
  );

  const reset = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { state, show, commit, reset };
}
