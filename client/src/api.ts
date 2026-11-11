// Typed RPC client for the public app.
// POSTs {action, deviceId, args} to /actions and returns the typed
// response. No Hatch SDK, no account, no login.
//
// deviceId: an anonymous UUID generated in this browser on first visit
// and stored in this browser's localStorage only
// ("richards-resource:device-id:v1"). It is sent with every action so
// the server can scope plans, logs, and points to this device alone.
// It is not a name, email, or account, and it is never shared with
// anyone. If the browser is cleared or the phone changes, a new id is
// generated and that device starts fresh — the honest limit the app
// already states on every tab.

const DEVICE_ID_KEY = "richards-resource:device-id:v1";

export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch { /* storage blocked — fall through to an in-memory id */ }
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
  try { window.localStorage.setItem(DEVICE_ID_KEY, id); } catch { /* ignore */ }
  return id;
}

export type Profile = {
  category: "alcohol" | "smoking" | "gambling" | "drugs" | "codependency";
  quitDate: string | null;
  dailyCost: number | null;
  dailyAmount: string | null;
  planText: string | null;
  supportName: string | null;
  supportPhone: string | null;
};

export type LogEntry = {
  id: number;
  category: Profile["category"];
  kind: "urge" | "boundary" | "note";
  trigger: string | null;
  intensity: number | null;
  note: string | null;
  rodeItOut: boolean | null;
  createdAt: string;
};

export type PointTab = "home" | "alcohol" | "smoking" | "gambling" | "drugs" | "codependency" | "food" | "screens" | "wellbeing";
export type PointAction = "welcome" | "touch" | "field" | "quitDate" | "daySuccess" | "relapse" | "pause" | "plan" | "log" | "screening" | "slotLesson" | "phoneFree" | "checkin" | "screenOff";

export type PointEvent = { id: number; tab: PointTab; action: PointAction; points: number; day: string | null; createdAt: string };
export type DayMark = { tab: PointTab; action: "daySuccess" | "relapse"; day: string };

export type StateResponse = {
  profiles: Profile[];
  logs: LogEntry[];
  pointsByTab: { tab: PointTab; points: number }[];
  pointEvents: PointEvent[];
  welcomeAwarded: boolean;
  dayMarks: DayMark[];
};

type AwardResponse = { ok: true; points: number; already: boolean };

async function callAction<T>(action: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch("/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, deviceId: getDeviceId(), args }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Action ${action} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getState: (args: Record<string, never> = {}) => callAction<StateResponse>("getState", args),
  awardPoints: (args: { tab: PointTab; action: PointAction; day?: string }) => callAction<AwardResponse>("awardPoints", args),
  awardTouches: (args: { tab: PointTab; count: number }) => callAction<AwardResponse>("awardTouches", args),
  awardFields: (args: { tab: PointTab; count: number }) => callAction<AwardResponse>("awardFields", args),
  saveProfile: (args: {
    category: Profile["category"]; quitDate?: string | null; dailyCost?: number | null;
    dailyAmount?: string | null; planText?: string | null; supportName?: string | null; supportPhone?: string | null;
  }) => callAction<{ ok: true }>("saveProfile", args),
  addLog: (args: {
    category: Profile["category"]; kind?: "urge" | "boundary" | "note"; trigger?: string | null;
    intensity?: number | null; note?: string | null; rodeItOut?: boolean | null;
  }) => callAction<{ id: number }>("addLog", args),
  deleteLog: (args: { id: number }) => callAction<{ ok: true }>("deleteLog", args),
};

export type ApiRequest<C extends Record<string, (args: never) => Promise<unknown>>, K extends keyof C> = Parameters<C[K]>[0];
export type ApiResponse<C extends Record<string, (args: never) => Promise<unknown>>, K extends keyof C> = Awaited<ReturnType<C[K]>>;
