"use client";

const RING_SIZE = 100;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TREND_ARROWS: Record<string, string> = {
  up: "\u2191",
  down: "\u2193",
  flat: "\u2192",
};

export function HealthRing({
  score,
  status,
  trend,
}: {
  score: number;
  status: string;
  trend: string;
}) {
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        {/* Background ring */}
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          className="absolute inset-0"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={STROKE_WIDTH}
          />
        </svg>

        {/* Progress ring */}
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold font-mono tracking-tighter">
            {score}
          </span>
        </div>
      </div>

      {/* Status + trend */}
      <p className="text-xs text-muted-foreground">
        {status} {TREND_ARROWS[trend] || ""}
      </p>
    </div>
  );
}
