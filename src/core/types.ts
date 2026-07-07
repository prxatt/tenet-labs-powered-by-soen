/** Platform-agnostic domain types — shared with the future React Native app. */

export type BlockClass = 'tGreen' | 'tGreen2' | 'tAmber' | 'tRed' | 'tBlue' | 'tPlum' | 'tGhost';

export interface Block {
  id: string;
  /** start hour, decimal (e.g. 15.5 = 3:30 PM) */
  t: number;
  /** duration in hours */
  dur: number;
  cls: BlockClass;
  ti: string;
  su?: string;
  fo: string;
  /** movable by the user */
  mv?: boolean | number;
  lock?: boolean | number;
  /** origin date key YYYY-MM-DD */
  date: string;
  /** user-created via slash command / AI */
  cust?: boolean | number;
  movedIn?: boolean | number;
}

/** User edit overlay applied on top of a generated base block. */
export interface BlockEdit {
  ti?: string;
  su?: string;
  t?: number;
  dur?: number;
  cls?: BlockClass;
}

export interface CustomEvent {
  id: string;
  t: number;
  dur: number;
  ti: string;
  su?: string;
  fo?: string;
  cls?: BlockClass;
}

export interface TodoItem {
  x: string;
  d: 0 | 1;
  n?: boolean;
}

export interface DayLog {
  e?: number | null;
  q?: number | null;
  n?: string;
}

export interface OuraDay {
  r?: number; s?: number; hrv?: number; rhr?: number;
  st?: 0 | 1 | 2; act?: number; steps?: number; cal?: number; br?: number;
}

export interface Recipe {
  c: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks & Dessert';
  n: string;
  tag: string;
  mac: string;
  ing: string[];
  st: string[];
  /** user-added via AI */
  user?: boolean;
  id?: string;
}

/** Everything that syncs across devices. */
export interface PlanState {
  moves: Record<string, string>;           // "date|id" -> destination date
  times: Record<string, number>;           // "date|id" -> new start hour
  done: Record<string, 1>;                 // "date|id" -> done
  edits: Record<string, BlockEdit>;        // "date|id" -> edit overlay
  logs: Record<string, DayLog>;            // date -> log
  todos: Record<string, TodoItem[]>;       // date -> capture items
  custom: Record<string, CustomEvent[]>;   // date -> user events
  shots: Record<string, Record<number, 1>>;// date -> recording checklist state
  userRecipes: Recipe[];
  /** Oura daily metrics — syncs cross-device via plan_state */
  ouraData?: Record<string, OuraDay>;
  prefs: {
    repoA?: string; repoB?: string;
    ollama?: boolean; ollamaModel?: string;
    gymLoc?: { la: number; lo: number } | null;
    homeLoc?: { la: number; lo: number } | null;
  };
  updatedAt: number;
}

export const emptyPlanState = (): PlanState => ({
  moves: {}, times: {}, done: {}, edits: {}, logs: {}, todos: {},
  custom: {}, shots: {}, userRecipes: [],
  prefs: { gymLoc: null, repoB: 'prxatt/tenet-labs-powered-by-soen', ollamaModel: 'hermes-agent' }, updatedAt: 0,
});

export interface LaneBlock {
  b: Block;
  col: number;
  cols: number;
}
