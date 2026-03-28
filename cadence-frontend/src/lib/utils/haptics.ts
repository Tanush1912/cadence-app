/**
 * Haptic feedback for PWA interactions.
 *
 * Uses navigator.vibrate() (Android, some iOS PWA contexts).
 * Falls back silently on unsupported platforms — no-op, no errors.
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 5,
  medium: 15,
  heavy: 30,
  success: [10, 30, 10],
  error: [20, 50, 20, 50, 20],
};

export function haptic(pattern: HapticPattern = "light") {
  try {
    navigator?.vibrate?.(PATTERNS[pattern]);
  } catch {
    // Silently fail — vibration not available
  }
}
