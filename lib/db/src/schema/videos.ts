import { pgTable, bigserial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sectionsTable } from "./sections";

export const videosTable = pgTable("videos", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sectionId: bigserial("section_id", { mode: "number" }).notNull().references(() => sectionsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  youtubeUrl: varchar("youtube_url", { length: 500 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;
