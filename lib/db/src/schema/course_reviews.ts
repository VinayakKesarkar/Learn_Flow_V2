import { pgTable, bigserial, integer, text, timestamp, unique, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";

export const courseReviewsTable = pgTable(
  "course_reviews",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigserial("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subjectId: bigserial("subject_id", { mode: "number" })
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    reviewText: text("review_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("course_reviews_user_subject_unique").on(table.userId, table.subjectId),
    index("course_reviews_subject_idx").on(table.subjectId),
    index("course_reviews_rating_idx").on(table.rating),
    check("course_reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export type CourseReview = typeof courseReviewsTable.$inferSelect;
export type InsertCourseReview = typeof courseReviewsTable.$inferInsert;
