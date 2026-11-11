import { bigserial, boolean, doublePrecision, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const categories = ["alcohol", "smoking", "gambling", "drugs", "codependency"] as const;

export const pointTabs = ["home", "alcohol", "smoking", "gambling", "drugs", "codependency", "food", "screens", "wellbeing"] as const;

export const pointActions = ["welcome", "touch", "field", "quitDate", "daySuccess", "relapse", "pause", "plan", "log", "screening", "slotLesson", "phoneFree", "checkin", "screenOff"] as const;

// deviceId: an anonymous UUID generated in the visitor's own browser on
// first visit and stored in that browser's localStorage only. It is NOT
// an account, name, or email. Every row is scoped by it, so no visitor
// can ever see or overwrite another visitor's plans, logs, or points.
// "We don't share your data. This is your personal journey."

export const profiles = pgTable("profiles", {
  deviceId: text("device_id").notNull(),
  category: text("category", { enum: categories }).notNull(),
  quitDate: text("quit_date"),
  dailyCost: doublePrecision("daily_cost"),
  dailyAmount: text("daily_amount"),
  planText: text("plan_text"),
  supportName: text("support_name"),
  supportPhone: text("support_phone"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.deviceId, t.category] })]);

export const logs = pgTable("logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  deviceId: text("device_id").notNull(),
  category: text("category", { enum: categories }).notNull(),
  kind: text("kind", { enum: ["urge", "boundary", "note"] }).notNull().default("urge"),
  trigger: text("trigger"),
  intensity: integer("intensity"),
  note: text("note"),
  rodeItOut: boolean("rode_it_out"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("logs_device_category_idx").on(t.deviceId, t.category, t.id)]);

// Points follow Richard's system (2026-11-10 revision): no maximum, one
// running total across every tab. +10 welcome, +1 per finger touch,
// +5 per data field, +50 for picking a quit date, +100 for each
// successful day after it, −100 for a relapse, +10 screenOff (Screens
// tab, self-reported "I turned my screen off"). Older action names
// stay in the enum so historical events keep rendering. `day` carries
// the client's local calendar day (YYYY-MM-DD) for quit-date and daily
// marks so a quit date or a day can only be awarded once — per device.
export const points = pgTable("points", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  deviceId: text("device_id").notNull(),
  tab: text("tab", { enum: pointTabs }).notNull(),
  action: text("action", { enum: pointActions }).notNull(),
  points: integer("points").notNull(),
  day: text("day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("points_device_tab_idx").on(t.deviceId, t.tab)]);
