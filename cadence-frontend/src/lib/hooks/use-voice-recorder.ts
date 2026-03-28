"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const getMimeType = (): string => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  };

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Voice recording not supported in this browser");
      return;
    }

    setError(null);
    chunks.current = [];

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();

      mediaRecorder.current = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.start(100);
      setIsRecording(true);

      autoStopTimer.current = setTimeout(() => {
        if (mediaRecorder.current?.state === "recording") {
          mediaRecorder.current.stop();
        }
      }, 20000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access denied");
      } else {
        setError("Failed to start recording");
      }
    }
  }, [isSupported]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }

    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state !== "recording") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.current.onstop = () => {
        const mimeType = mediaRecorder.current?.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type: mimeType });
        chunks.current = [];

        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        mediaRecorder.current = null;

        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.current.stop();
    });
  }, []);

  return { isRecording, isSupported, startRecording, stopRecording, error };
}
