"use client";

import { useCallback, useEffect, useState } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useGunNode } from "@/lib/hooks/use-gun-node";
import { DEFAULT_PROFILE } from "@/lib/constants";
import { encrypt, decrypt } from "@/lib/crypto/key-vault";
import type { Profile } from "@/lib/types";

interface ProfileSettings extends Profile {
  aiProvider?: "claude" | "openai";
  aiKey?: string;
  minimumMode?: boolean;
  minimumModeDate?: string;
}

export function useProfile() {
  const gun = useGun();
  const { data, loading } = useGunNode<Record<string, unknown>>("profile");
  const [decryptedKey, setDecryptedKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const encryptedKey = data?.aiKey as string | undefined;
    if (!encryptedKey) {
      setDecryptedKey(undefined);
      return;
    }

    decrypt(encryptedKey).then((plaintext) => {
      setDecryptedKey(plaintext);
    });
  }, [data?.aiKey]);

  const profile: ProfileSettings = data
    ? {
        username: (data.username as string) ?? DEFAULT_PROFILE.username,
        dailyGoal: (data.dailyGoal as number) ?? DEFAULT_PROFILE.dailyGoal,
        accent: (data.accent as Profile["accent"]) ?? DEFAULT_PROFILE.accent,
        createdAt: (data.createdAt as number) ?? DEFAULT_PROFILE.createdAt,
        aiProvider: (data.aiProvider as "claude" | "openai") ?? undefined,
        aiKey: decryptedKey,
        minimumMode: (data.minimumMode as boolean) ?? false,
        minimumModeDate: (data.minimumModeDate as string) ?? undefined,
      }
    : { ...DEFAULT_PROFILE };

  const updateProfile = useCallback(
    async (updates: Partial<ProfileSettings>) => {
      if (!gun) return;

      if (updates.aiKey !== undefined) {
        const encrypted = await encrypt(updates.aiKey);
        gun.get("profile").put({ ...updates, aiKey: encrypted });
      } else {
        gun.get("profile").put(updates);
      }
    },
    [gun]
  );

  return { profile, loading, updateProfile };
}
