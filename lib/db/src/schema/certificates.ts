import { pgTable, bigserial, varchar, timestamp, unique, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { subjectsTable } from "./subjects";

export const certificatesTable = pgTable(
  "certificates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigserial("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subjectId: bigserial("subject_id", { mode: "number" })
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    certificateUrl: varchar("certificate_url", { length: 1000 }).notNull(),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
  },
  (table) => [
    unique("certificates_user_subject_unique").on(table.userId, table.subjectId),
    index("certificates_user_idx").on(table.userId),
  ],
);

export type Certificate = typeof certificatesTable.$inferSelect;
export type InsertCertificate = typeof certificatesTable.$inferInsert;
