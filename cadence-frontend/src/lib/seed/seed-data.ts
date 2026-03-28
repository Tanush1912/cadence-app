import { addDays, todayKey } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";

const SEED_HABITS = [
  { id: "h1", name: "Meditate", emoji: "\u{1F9D8}", group: "morning", frequency: "daily", floor: "2 minutes", order: 1 },
  { id: "h2", name: "Exercise", emoji: "\u{1F3CB}", group: "morning", frequency: "days:mon,wed,fri", floor: "10 minutes", order: 2 },
  { id: "h3", name: "Cold shower", emoji: "\u{1F6BF}", group: "morning", frequency: "daily", order: 3 },
  { id: "h4", name: "Journal", emoji: "\u{1F4D3}", group: "morning", frequency: "weekdays", floor: "1 sentence", order: 4 },
  { id: "h5", name: "Healthy breakfast", emoji: "\u{1F373}", group: "morning", frequency: "daily", order: 5 },
  { id: "h6", name: "Read", emoji: "\u{1F4D6}", group: "evening", frequency: "daily", floor: "10 pages", order: 1 },
  { id: "h7", name: "No screens after 9pm", emoji: "\u{1F4F5}", group: "evening", frequency: "daily", order: 2 },
  { id: "h8", name: "Gratitude log", emoji: "\u{1F64F}", group: "evening", frequency: "daily", floor: "1 thing", order: 3 },
  { id: "h9", name: "Deep work block", emoji: "\u{1F9E0}", group: "anytime", frequency: "weekdays", floor: "25 min", order: 1 },
  { id: "h10", name: "Walk 10k steps", emoji: "\u{1F6B6}", group: "anytime", frequency: "daily", order: 2 },
];

function generateLogs(daysBack: number) {
  const logs: Record<string, Record<string, { done: boolean; friction: number | null; retroactive: boolean; completedAt: number | null }>> = {};
  const today = todayKey();

  for (let i = daysBack; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    logs[dateKey] = {};

    for (const habit of SEED_HABITS) {
      if (!isScheduledOn(habit.frequency, dateKey)) continue;

      const rand = Math.random();
      const morningBias = habit.group === "morning" ? 0.75 : habit.group === "evening" ? 0.6 : 0.5;
      const done = rand < morningBias;

      if (done) {
        const frictionRand = Math.random();
        let friction: number | null = null;
        if (frictionRand > 0.3) {
          friction = frictionRand > 0.7 ? 1 : frictionRand > 0.5 ? 2 : 3;
        }

        logs[dateKey][habit.id] = {
          done: true,
          friction,
          retroactive: false,
          completedAt: Date.now() - i * 86400000 + Math.random() * 43200000,
        };
      }
    }
  }

  return logs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedIfEmpty(gun: any) {
  if (!gun) return;

  return new Promise<void>((resolve) => {
    gun.get("_meta").get("seeded").once((val: unknown) => {
      if (val) {
        resolve();
        return;
      }

      gun.get("profile").put({
        username: "user",
        dailyGoal: 0.7,
        accent: "green",
        createdAt: Date.now(),
      });

      for (const habit of SEED_HABITS) {
        gun.get("habits").get(habit.id).put({
          name: habit.name,
          emoji: habit.emoji,
          group: habit.group,
          frequency: habit.frequency,
          floor: habit.floor || "",
          order: habit.order,
          archived: false,
          createdAt: Date.now(),
        });
      }

      const logs = generateLogs(6);
      for (const [dateKey, dayLogs] of Object.entries(logs)) {
        for (const [habitId, log] of Object.entries(dayLogs)) {
          gun.get("logs").get(dateKey).get(habitId).put(log);
        }
      }

      gun.get("_meta").get("seeded").put(true);

      setTimeout(resolve, 200);
    });
  });
}
