import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env from api-server
config({ path: resolve(__dirname, "../../../artifacts/api-server/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to set it in api-server/.env?");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("Seeding database...");

  // Insert Subject
  const [subject] = await db.insert(schema.subjectsTable).values({
    title: "Introduction to Advanced Algorithms",
    slug: "intro-advanced-algorithms",
    description: "Learn the fundamentals of advanced algorithms and data structures.",
    isPublished: true,
  }).returning();

  // Insert Section
  const [section] = await db.insert(schema.sectionsTable).values({
    subjectId: subject.id,
    title: "Graph Algorithms",
    orderIndex: 1,
  }).returning();

  // Insert Video
  await db.insert(schema.videosTable).values({
    sectionId: section.id,
    title: "Dijkstra's Algorithm",
    description: "Finding the shortest paths between nodes in a graph.",
    youtubeUrl: "https://www.youtube.com/watch?v=_lHSawdgXpI",
    orderIndex: 1,
    durationSeconds: 600,
  });

  console.log("Database seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
