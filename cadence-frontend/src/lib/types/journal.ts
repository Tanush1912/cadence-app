export type Mood = "great" | "good" | "okay" | "rough" | "bad" | null;

export interface JournalEntry {
  text: string;
  mood: Mood;
  createdAt: number;
  updatedAt: number;
}
