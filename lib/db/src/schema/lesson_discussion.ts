import { pgTable, bigserial, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { videosTable } from "./videos";

export const lessonQuestionsTable = pgTable(
  "lesson_questions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    videoId: bigserial("video_id", { mode: "number" })
      .notNull()
      .references(() => videosTable.id, { onDelete: "cascade" }),
    userId: bigserial("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lesson_questions_video_idx").on(table.videoId),
  ],
);

export const lessonAnswersTable = pgTable(
  "lesson_answers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    questionId: bigserial("question_id", { mode: "number" })
      .notNull()
      .references(() => lessonQuestionsTable.id, { onDelete: "cascade" }),
    userId: bigserial("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    answerText: text("answer_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("lesson_answers_question_idx").on(table.questionId),
  ],
);

export type LessonQuestion = typeof lessonQuestionsTable.$inferSelect;
export type InsertLessonQuestion = typeof lessonQuestionsTable.$inferInsert;
export type LessonAnswer = typeof lessonAnswersTable.$inferSelect;
export type InsertLessonAnswer = typeof lessonAnswersTable.$inferInsert;
