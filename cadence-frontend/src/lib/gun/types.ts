/**
 * GunDB type definitions.
 * GunDB doesn't ship its own types, so we define the subset we use.
 */

export interface GunNodeData {
  [key: string]: unknown;
  _?: { "#"?: string; ">"?: Record<string, number> };
}

export interface GunChainRef {
  get(key: string): GunChainRef;
  put(data: Record<string, unknown> | string | number | boolean | null): GunChainRef;
  on(cb: (data: GunNodeData | null, key: string) => void): GunChainRef;
  once(cb: (data: GunNodeData | null, key: string) => void): GunChainRef;
  map(): GunChainRef;
  off(): void;
}

export type GunInstance = GunChainRef;
