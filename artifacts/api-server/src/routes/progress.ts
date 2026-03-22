import { Router } from "express";
import { db, videoProgressTable, videosTable, sectionsTable, enrollmentsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/videos/:videoId", requireAuth, async (req, res) => {
  const videoId = parseInt(req.params.videoId as string);
  if (!videoId) {
    res.status(400).json({ error: "bad_request", message: "Invalid video ID" });
    return;
  }

  const [progress] = await db
    .select()
    .from(videoProgressTable)
    .where(and(eq(videoProgressTable.userId, req.userId!), eq(videoProgressTable.videoId, videoId)));

  res.json({
    videoId,
    lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
    isCompleted: progress?.isCompleted ?? false,
    completedAt: progress?.completedAt ?? null,
  });
});

router.post("/videos/:videoId", requireAuth, async (req, res) => {
  const videoId = parseInt(req.params.videoId as string);
  if (!videoId) {
    res.status(400).json({ error: "bad_request", message: "Invalid video ID" });
    return;
  }

  const { lastPositionSeconds, isCompleted } = req.body;
  if (typeof lastPositionSeconds !== "number") {
    res.status(400).json({ error: "validation_error", message: "lastPositionSeconds is required and must be a number" });
    return;
  }

  const completedAt = isCompleted ? new Date() : undefined;

  // Check existing progress
  const [existing] = await db
    .select()
    .from(videoProgressTable)
    .where(and(eq(videoProgressTable.userId, req.userId!), eq(videoProgressTable.videoId, videoId)));

  let result;
  if (existing) {
    // Only mark completed if not already completed
    const nowCompleted = isCompleted || existing.isCompleted;
    const nowCompletedAt = existing.completedAt || (isCompleted ? new Date() : null);

    [result] = await db
      .update(videoProgressTable)
      .set({
        lastPositionSeconds,
        isCompleted: nowCompleted,
        completedAt: nowCompletedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(videoProgressTable.userId, req.userId!), eq(videoProgressTable.videoId, videoId)))
      .returning();
  } else {
    [result] = await db
      .insert(videoProgressTable)
      .values({
        userId: req.userId!,
        videoId,
        lastPositionSeconds,
        isCompleted: isCompleted ?? false,
        completedAt: isCompleted ? new Date() : null,
      })
      .returning();
  }

  res.json({
    videoId,
    lastPositionSeconds: result.lastPositionSeconds,
    isCompleted: result.isCompleted,
    completedAt: result.completedAt,
  });
});

router.get("/subjects/:subjectId", requireAuth, async (req, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  if (!subjectId) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  // Get all videos in subject
  const allVideos = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
    .where(eq(sectionsTable.subjectId, subjectId));

  const totalVideos = allVideos.length;
  const videoIds = allVideos.map((v) => Number(v.id));

  if (totalVideos === 0) {
    res.json({
      subjectId,
      totalVideos: 0,
      completedVideos: 0,
      percentComplete: 0,
      lastVideoId: null,
      lastPositionSeconds: null,
    });
    return;
  }

  const progresses = await db
    .select()
    .from(videoProgressTable)
    .where(eq(videoProgressTable.userId, req.userId!));

  const subjectProgresses = progresses.filter((p) => videoIds.includes(Number(p.videoId)));
  const completedVideos = subjectProgresses.filter((p) => p.isCompleted).length;

  // Find last watched
  const sortedByUpdated = subjectProgresses.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const lastProgress = sortedByUpdated[0];

  res.json({
    subjectId,
    totalVideos,
    completedVideos,
    percentComplete: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
    lastVideoId: lastProgress ? Number(lastProgress.videoId) : null,
    lastPositionSeconds: lastProgress?.lastPositionSeconds ?? null,
  });
});

export default router;
