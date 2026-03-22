import { pgTable, bigserial, varchar, integer, timestamp, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const sectionsTable = pgTable("sections", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subjectId: bigserial("subject_id", { mode: "number" }).notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSectionSchema = createInsertSchema(sectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type Section = typeof sectionsTable.$inferSelect;
