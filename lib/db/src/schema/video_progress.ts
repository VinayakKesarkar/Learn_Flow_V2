import { pgTable, bigserial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { videosTable } from "./videos";

export const videoProgressTable = pgTable("video_progress", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigserial("user_id", { mode: "number" }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  videoId: bigserial("video_id", { mode: "number" }).notNull().references(() => videosTable.id, { onDelete: "cascade" }),
  lastPositionSeconds: integer("last_position_seconds").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("video_progress_user_video_unique").on(table.userId, table.videoId),
]);

export const insertVideoProgressSchema = createInsertSchema(videoProgressTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideoProgress = z.infer<typeof insertVideoProgressSchema>;
export type VideoProgress = typeof videoProgressTable.$inferSelect;
