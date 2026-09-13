"use client";

import { useEffect, useState } from "react";

const KEYBOARD_OPEN_THRESHOLD = 80;

export interface VisualViewportState {
  height: number;
  offsetTop: number;
  innerHeight: number;
  keyboardInset: number;
  isKeyboardOpen: boolean;
}

const INITIAL: VisualViewportState = {
  height: 0,
  offsetTop: 0,
  innerHeight: 0,
  keyboardInset: 0,
  isKeyboardOpen: false,
};

function read(): VisualViewportState {
  if (typeof window === "undefined") return INITIAL;

  const innerHeight = window.innerHeight;
  const viewport = window.visualViewport;
  if (!viewport) {
    return { height: innerHeight, offsetTop: 0, innerHeight, keyboardInset: 0, isKeyboardOpen: false };
  }

  const inset = Math.max(0, innerHeight - viewport.height - viewport.offsetTop);
  // iOS 26 leaves visualViewport.offsetTop non-zero after the keyboard closes, so a small inset means closed, not shifted.
  const isKeyboardOpen = inset >= KEYBOARD_OPEN_THRESHOLD;

  return {
    height: viewport.height,
    offsetTop: viewport.offsetTop,
    innerHeight,
    keyboardInset: isKeyboardOpen ? inset : 0,
    isKeyboardOpen,
  };
}

function isSame(a: VisualViewportState, b: VisualViewportState) {
  return (
    a.height === b.height &&
    a.offsetTop === b.offsetTop &&
    a.innerHeight === b.innerHeight &&
    a.keyboardInset === b.keyboardInset &&
    a.isKeyboardOpen === b.isKeyboardOpen
  );
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(INITIAL);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      frame = 0;
      setState((previous) => {
        const next = read();
        return isSame(previous, next) ? previous : next;
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    sync();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  return state;
}
