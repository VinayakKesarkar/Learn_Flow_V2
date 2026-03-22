import { db, subjectsTable, sectionsTable, videosTable } from "@workspace/db";

async function main() {
  console.log("Seeding database...");

  // Insert Subject
  const [subject] = await db.insert(subjectsTable).values({
    title: "Introduction to Advanced Algorithms",
    slug: "intro-advanced-algorithms",
    description: "Learn the fundamentals of advanced algorithms and data structures.",
    isPublished: true,
  }).returning();

  // Insert Section
  const [section] = await db.insert(sectionsTable).values({
    subjectId: subject.id,
    title: "Graph Algorithms",
    orderIndex: 1,
  }).returning();

  // Insert Video
  await db.insert(videosTable).values({
    sectionId: section.id,
    title: "Dijkstra's Algorithm",
    description: "Finding the shortest paths between nodes in a graph.",
    youtubeUrl: "https://www.youtube.com/watch?v=_lHSawdgXpI",
    orderIndex: 1,
    durationSeconds: 600,
  });

  // Insert another Subject
  const [subject2] = await db.insert(subjectsTable).values({
    title: "React Masterclass",
    slug: "react-masterclass",
    description: "Build robust and scalable applications with modern React.",
    isPublished: true,
  }).returning();

  const [section2] = await db.insert(sectionsTable).values({
    subjectId: subject2.id,
    title: "Hooks in depth",
    orderIndex: 1,
  }).returning();

  await db.insert(videosTable).values({
    sectionId: section2.id,
    title: "useEffect internally",
    description: "How useEffect works under the hood",
    youtubeUrl: "https://www.youtube.com/watch?v=0ZNIQOO2sfA",
    orderIndex: 1,
    durationSeconds: 900,
  });

  console.log("Database seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
