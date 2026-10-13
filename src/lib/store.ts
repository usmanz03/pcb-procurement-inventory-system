"use client";

/*
 * Client store. Each action runs the shared engine locally for an instant response, then the
 * same action is executed authoritatively by the server inside a PostgreSQL transaction and the
 * returned state replaces the local one. Changes by other users arrive by polling.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import { ACTION_TAB, createActions, initialData, initialWorkflow, permit, type ActionName, type Actions, type Data, type EngineState, type Result, type Workflow } from "./engine";
import type { RoleKey } from "./types";

export { canAccess, ledgerFor, tenderGates } from "./engine";
export type { Result } from "./engine";

export interface SyncState {
  hydrated: boolean;
  status: "connecting" | "live" | "saving" | "offline";
  version: number;
  head: number;
  engine: string;
  lastSync: number;
  pending: number;
  clientId: string;
  signedIn: boolean;
  identity: Identity | null;
}

export interface Identity { name: string; email: string; role: RoleKey; department?: string }
export const SEEDED: { role: RoleKey; email: string }[] = [
  { role: "director", email: "usman.zafar@pcb.com.pk" },
  { role: "committee", email: "farhan.ali@pcb.com.pk" },
  { role: "cfo", email: "tariq.mehmood@pcb.com.pk" },
  { role: "storekeeper", email: "muhammad.rashid@pcb.com.pk" },
  { role: "auditor", email: "audit@agp.gov.pk" },
];
export const DEMO_PASSWORD = "Pcb@2026";

interface ClientActions {
  setRole: (r: RoleKey) => void;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (u: { name: string; email: string; password: string; role: RoleKey; department: string }) => Promise<Result>;
  signOut: () => void;
  reset: () => Promise<Result>;
}

export type AppState = EngineState & Actions & ClientActions & { sync: SyncState };
type Snapshot = { version: number; state: Data & Workflow; head?: number; engine?: string; events?: AuditEvent[] };
type AuditEvent = { id: number; actor: string; role: string; client_id: string | null; title: string; description: string; badge: string };

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const clientId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const serialisable = (args: unknown[]) => args.filter((a) => !(a && typeof a === "object" && ("nativeEvent" in (a as object) || (typeof Event !== "undefined" && a instanceof Event))));

let queue: Promise<unknown> = Promise.resolve();

export const useApp = create<AppState>()(
  immer((set, get) => {
    const local = createActions((recipe) => set(recipe as never), () => get());
    const actions = Object.fromEntries(
      (Object.keys(ACTION_TAB) as ActionName[]).map((name) => [
        name,
        (...raw: unknown[]) => {
          const args = serialisable(raw);
          const denied = permit(get(), name);
          if (denied) return denied;
          const before = get();
          const result = (local[name] as (...a: unknown[]) => Result)(...args);
          if (get() !== before) send(name, args, result);
          return result;
        },
      ])
    ) as unknown as Actions;

    return {
      ...initialData(),
      ...initialWorkflow(),
      role: "director" as RoleKey,
      sync: { hydrated: false, status: "connecting", version: -1, head: 0, engine: "PostgreSQL", lastSync: 0, pending: 0, clientId, signedIn: false, identity: null },
      ...actions,
      setRole: (r) => {
        const base = baseRoles ?? get().roles;
        become({ name: base[r].user, email: SEEDED.find((x) => x.role === r)!.email, role: r });
      },
      signIn: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
          const json = await res.json();
          if (!res.ok) return { ok: false, title: "Could not sign in", message: json.error ?? res.statusText };
          become(json.user);
          return { ok: true, title: `Welcome, ${json.user.name.split(" ")[0]}`, message: get().roles[json.user.role as RoleKey].label };
        } catch { return { ok: false, title: "Could not sign in", message: "The server could not be reached." }; }
      },
      signUp: async (u) => {
        try {
          const res = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(u) });
          const json = await res.json();
          if (!res.ok) return { ok: false, title: "Could not create the account", message: json.error ?? res.statusText };
          become(json.user);
          return { ok: true, title: `Welcome, ${json.user.name.split(" ")[0]}`, message: "Your account is ready." };
        } catch { return { ok: false, title: "Could not create the account", message: "The server could not be reached." }; }
      },
      signOut: () => { set((s) => { s.sync.signedIn = false; s.sync.identity = null; }); ls.set("pcb.user", null); ls.set("pcb.role", null); },
      reset: async () => {
        const res = await fetch("/api/reset", { method: "POST", headers: { "x-pcb-role": get().role } });
        const json = await res.json();
        if (!res.ok) return { ok: false, title: "Reset failed", message: json.error ?? res.statusText };
        apply(json);
        return { ok: true, title: "Demo data reset", message: "Baseline reloaded from the migration set." };
      },
    };
  })
);

let baseRoles: Data["roles"] | null = null;
const initialsOf = (name: string) => name.replace(/^(Engr|Dr|Mr|Ms|Mrs)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
function overlay(roles: Data["roles"], id: Identity | null): Data["roles"] {
  if (!id || roles[id.role].user === id.name) return roles;
  return { ...roles, [id.role]: { ...roles[id.role], user: id.name, initials: initialsOf(id.name) } };
}
function become(id: Identity) {
  const st = useApp.getState();
  baseRoles = baseRoles ?? st.roles;
  ls.set("pcb.user", JSON.stringify(id));
  useApp.setState({ role: id.role, roles: overlay(baseRoles, id), sync: { ...st.sync, signedIn: true, identity: id } } as Partial<AppState>);
}

function apply(snap: Snapshot) {
  const { state, version, head, engine } = snap;
  const cur = useApp.getState().sync;
  baseRoles = state.roles;
  useApp.setState({
    ...state,
    roles: overlay(state.roles, cur.identity),
    sync: { ...cur, hydrated: true, status: cur.pending ? "saving" : "live", version, head: Math.max(head ?? 0, cur.head), engine: engine ?? cur.engine, lastSync: Date.now() },
  } as Partial<AppState>);
}

function setSync(p: Partial<SyncState>) {
  useApp.setState({ sync: { ...useApp.getState().sync, ...p } } as Partial<AppState>);
}

function send(name: ActionName, args: unknown[], optimistic: Result) {
  setSync({ pending: useApp.getState().sync.pending + 1, status: "saving" });
  queue = queue.then(async () => {
    try {
      const res = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json", "x-pcb-role": useApp.getState().role, "x-pcb-user": encodeURIComponent(useApp.getState().sync.identity?.name ?? "") }, body: JSON.stringify({ name, args, clientId }) });
      const json = await res.json();
      if (json.state) apply(json);
      if (!res.ok && res.status !== 422) throw new Error(json.error ?? res.statusText);
      if (json.result && !json.result.ok && optimistic.ok) toast.error(`Not saved: ${json.result.title}`, { description: json.result.message });
    } catch (e) {
      toast.error("Could not reach the server", { description: `${e instanceof Error ? e.message : e}. The change was not saved.` });
      setSync({ status: "offline" });
      await pull(true);
    } finally {
      const p = Math.max(0, useApp.getState().sync.pending - 1);
      setSync({ pending: p, ...(p === 0 && useApp.getState().sync.status === "saving" ? { status: "live" } : {}) });
    }
  });
}

async function pull(force = false) {
  const { sync, roles } = useApp.getState();
  if (sync.pending && !force) return;
  try {
    const res = await fetch(`/api/state?since=${force ? -1 : sync.version}&after=${sync.head}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? res.statusText);
    if (json.unchanged) { setSync({ status: "live", lastSync: Date.now() }); return; }
    if (useApp.getState().sync.pending && !force) return;
    const first = !useApp.getState().sync.hydrated;
    apply(json);
    if (!first) {
      for (const e of [...(json.events as AuditEvent[])].reverse()) {
        if (e.client_id === clientId) continue;
        const who = roles[e.role as RoleKey]?.label ?? e.role;
        toast(`${e.actor} · ${who}`, { description: `${e.title}: ${e.description}` });
      }
    }
  } catch {
    setSync({ status: "offline" });
  }
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;
  try {
    const id = JSON.parse(ls.get("pcb.user") ?? "null") as Identity | null;
    if (id?.role && id.name) become(id);
  } catch { /* ignore a corrupt saved session */ }
  void pull(true);
  setInterval(() => { if (typeof document === "undefined" || document.visibilityState === "visible") void pull(); }, 2500);
}

/* ---------- Selectors ---------- */
export const useRole = () => useApp((s) => s.roles[s.role]);
