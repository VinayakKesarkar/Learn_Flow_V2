import { Router } from "express";
import { db, subjectsTable, sectionsTable, videosTable, enrollmentsTable, videoProgressTable } from "@workspace/db";
import { eq, and, sql, ilike, or, count } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /subjects/enrolled — returns only subjects the current user is enrolled in, with progress
router.get("/enrolled", requireAuth, async (req, res) => {
  const enrollments = await db
    .select({ subjectId: enrollmentsTable.subjectId, enrolledAt: enrollmentsTable.createdAt })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, req.userId!));

  if (enrollments.length === 0) {
    res.json({ subjects: [] });
    return;
  }

  const result = await Promise.all(
    enrollments.map(async (enrollment) => {
      const subjectId = Number(enrollment.subjectId);

      const [subject] = await db
        .select()
        .from(subjectsTable)
        .where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.isPublished, true)));

      if (!subject) return null;

      const sections = await db
        .select({ id: sectionsTable.id })
        .from(sectionsTable)
        .where(eq(sectionsTable.subjectId, subjectId));

      let totalVideos = 0;
      for (const section of sections) {
        const [{ cnt }] = await db
          .select({ cnt: count() })
          .from(videosTable)
          .where(eq(videosTable.sectionId, Number(section.id)));
        totalVideos += Number(cnt);
      }

      // Get all video IDs in this subject
      const allVideos = await db
        .select({ id: videosTable.id })
        .from(videosTable)
        .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
        .where(eq(sectionsTable.subjectId, subjectId));

      const videoIds = allVideos.map((v) => Number(v.id));

      const progresses = await db
        .select()
        .from(videoProgressTable)
        .where(eq(videoProgressTable.userId, req.userId!));

      const subjectProgresses = progresses.filter((p) => videoIds.includes(Number(p.videoId)));
      const completedVideos = subjectProgresses.filter((p) => p.isCompleted).length;

      const sortedByUpdated = [...subjectProgresses].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      const lastProgress = sortedByUpdated[0];

      return {
        id: Number(subject.id),
        title: subject.title,
        slug: subject.slug,
        description: subject.description,
        isPublished: subject.isPublished,
        createdAt: subject.createdAt,
        enrolledAt: enrollment.enrolledAt,
        totalVideos,
        totalSections: sections.length,
        completedVideos,
        percentComplete: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
        lastVideoId: lastProgress ? Number(lastProgress.videoId) : null,
      };
    }),
  );

  res.json({ subjects: result.filter(Boolean) });
});

router.get("/", optionalAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  let whereClause = eq(subjectsTable.isPublished, true);

  const subjects = await db
    .select({
      id: subjectsTable.id,
      title: subjectsTable.title,
      slug: subjectsTable.slug,
      description: subjectsTable.description,
      isPublished: subjectsTable.isPublished,
      createdAt: subjectsTable.createdAt,
    })
    .from(subjectsTable)
    .where(
      search
        ? and(eq(subjectsTable.isPublished, true), ilike(subjectsTable.title, `%${search}%`))
        : eq(subjectsTable.isPublished, true),
    )
    .limit(limit)
    .offset(offset)
    .orderBy(subjectsTable.createdAt);

  const [{ total }] = await db
    .select({ total: count() })
    .from(subjectsTable)
    .where(
      search
        ? and(eq(subjectsTable.isPublished, true), ilike(subjectsTable.title, `%${search}%`))
        : eq(subjectsTable.isPublished, true),
    );

  // Get counts per subject
  const subjectIds = subjects.map((s) => Number(s.id));
  const result = await Promise.all(
    subjects.map(async (subject) => {
      const sections = await db
        .select({ id: sectionsTable.id })
        .from(sectionsTable)
        .where(eq(sectionsTable.subjectId, Number(subject.id)));

      let totalVideos = 0;
      for (const section of sections) {
        const [{ cnt }] = await db
          .select({ cnt: count() })
          .from(videosTable)
          .where(eq(videosTable.sectionId, Number(section.id)));
        totalVideos += Number(cnt);
      }

      return {
        ...subject,
        id: Number(subject.id),
        totalVideos,
        totalSections: sections.length,
      };
    }),
  );

  res.json({ subjects: result, total: Number(total), page, limit });
});

router.get("/:subjectId", optionalAuth, async (req, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  if (!subjectId) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  if (!subject || !subject.isPublished) {
    res.status(404).json({ error: "not_found", message: "Subject not found" });
    return;
  }

  const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.subjectId, subjectId));
  let totalVideos = 0;
  for (const section of sections) {
    const [{ cnt }] = await db.select({ cnt: count() }).from(videosTable).where(eq(videosTable.sectionId, Number(section.id)));
    totalVideos += Number(cnt);
  }

  let isEnrolled = false;
  if (req.userId) {
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, req.userId), eq(enrollmentsTable.subjectId, subjectId)));
    isEnrolled = !!enrollment;
  }

  res.json({
    id: Number(subject.id),
    title: subject.title,
    slug: subject.slug,
    description: subject.description,
    isPublished: subject.isPublished,
    createdAt: subject.createdAt,
    totalVideos,
    totalSections: sections.length,
    isEnrolled,
  });
});

router.get("/:subjectId/tree", requireAuth, async (req, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  if (!subjectId) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  if (!subject || !subject.isPublished) {
    res.status(404).json({ error: "not_found", message: "Subject not found" });
    return;
  }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.subjectId, subjectId))
    .orderBy(sectionsTable.orderIndex);

  // Get all videos for this subject ordered globally
  const allVideos = await db
    .select({
      id: videosTable.id,
      sectionId: videosTable.sectionId,
      title: videosTable.title,
      orderIndex: videosTable.orderIndex,
      durationSeconds: videosTable.durationSeconds,
    })
    .from(videosTable)
    .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
    .where(eq(sectionsTable.subjectId, subjectId))
    .orderBy(sectionsTable.orderIndex, videosTable.orderIndex);

  // Get user progress for all videos
  const progressMap = new Map<number, { isCompleted: boolean; lastPositionSeconds: number }>();
  if (req.userId && allVideos.length > 0) {
    const videoIds = allVideos.map((v) => Number(v.id));
    const progresses = await db
      .select()
      .from(videoProgressTable)
      .where(eq(videoProgressTable.userId, req.userId));
    for (const p of progresses) {
      if (videoIds.includes(Number(p.videoId))) {
        progressMap.set(Number(p.videoId), {
          isCompleted: p.isCompleted,
          lastPositionSeconds: p.lastPositionSeconds,
        });
      }
    }
  }

  // Determine lock status: first video always unlocked, each subsequent requires prev completed
  const videoLockMap = new Map<number, boolean>();
  for (let i = 0; i < allVideos.length; i++) {
    const vid = allVideos[i];
    if (i === 0) {
      videoLockMap.set(Number(vid.id), false);
    } else {
      const prevVid = allVideos[i - 1];
      const prevProgress = progressMap.get(Number(prevVid.id));
      videoLockMap.set(Number(vid.id), !(prevProgress?.isCompleted ?? false));
    }
  }

  const sectionMap = new Map<number, typeof sections[0]>();
  for (const s of sections) {
    sectionMap.set(Number(s.id), s);
  }

  const sectionVideos = new Map<number, typeof allVideos>();
  for (const v of allVideos) {
    const sId = Number(v.sectionId);
    if (!sectionVideos.has(sId)) sectionVideos.set(sId, []);
    sectionVideos.get(sId)!.push(v);
  }

  const tree = sections.map((section) => ({
    id: Number(section.id),
    title: section.title,
    orderIndex: section.orderIndex,
    videos: (sectionVideos.get(Number(section.id)) || []).map((v) => {
      const progress = progressMap.get(Number(v.id));
      return {
        id: Number(v.id),
        title: v.title,
        orderIndex: v.orderIndex,
        durationSeconds: v.durationSeconds,
        locked: videoLockMap.get(Number(v.id)) ?? false,
        isCompleted: progress?.isCompleted ?? false,
        lastPositionSeconds: progress?.lastPositionSeconds ?? null,
      };
    }),
  }));

  res.json({ id: Number(subject.id), title: subject.title, sections: tree });
});

router.post("/:subjectId/enroll", requireAuth, async (req, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  if (!subjectId) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  if (!subject || !subject.isPublished) {
    res.status(404).json({ error: "not_found", message: "Subject not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.userId!), eq(enrollmentsTable.subjectId, subjectId)));

  if (existing) {
    res.status(409).json({ error: "conflict", message: "Already enrolled" });
    return;
  }

  await db.insert(enrollmentsTable).values({ userId: req.userId!, subjectId });
  res.status(201).json({ message: "Enrolled successfully" });
});

router.get("/:subjectId/enrollment", requireAuth, async (req, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  if (!subjectId) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.userId!), eq(enrollmentsTable.subjectId, subjectId)));

  res.json({
    isEnrolled: !!enrollment,
    enrolledAt: enrollment?.createdAt ?? null,
  });
});

export default router;
