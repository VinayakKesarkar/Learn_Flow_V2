import { Router } from "express";
import {
  db,
  lessonQuestionsTable,
  lessonAnswersTable,
  usersTable,
  videosTable,
  sectionsTable,
  enrollmentsTable,
} from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Helper: check user is enrolled in the course that owns a video
async function isEnrolledForVideo(userId: number, videoId: number): Promise<boolean> {
  const [video] = await db
    .select({ sectionId: videosTable.sectionId })
    .from(videosTable)
    .where(eq(videosTable.id, videoId));
  if (!video) return false;

  const [section] = await db
    .select({ subjectId: sectionsTable.subjectId })
    .from(sectionsTable)
    .where(eq(sectionsTable.id, Number(video.sectionId)));
  if (!section) return false;

  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.userId, userId),
        eq(enrollmentsTable.subjectId, Number(section.subjectId)),
      ),
    );

  return !!enrollment;
}

// POST /api/questions
router.post("/", requireAuth, async (req, res) => {
  const { video_id, question_text } = req.body;
  if (!video_id || !question_text?.trim()) {
    res.status(400).json({ error: "bad_request", message: "video_id and question_text are required" });
    return;
  }

  const videoId = Number(video_id);
  if (!(await isEnrolledForVideo(req.userId!, videoId))) {
    res.status(403).json({ error: "forbidden", message: "You must be enrolled to ask questions" });
    return;
  }

  const [question] = await db
    .insert(lessonQuestionsTable)
    .values({ videoId, userId: req.userId!, questionText: question_text.trim() })
    .returning();

  res.status(201).json({ question });
});

// GET /api/questions/videos/:videoId
router.get("/videos/:videoId", requireAuth, async (req, res) => {
  const videoId = Number(req.params.videoId as string);
  if (isNaN(videoId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid video ID" });
    return;
  }

  const questions = await db
    .select({
      id: lessonQuestionsTable.id,
      questionText: lessonQuestionsTable.questionText,
      createdAt: lessonQuestionsTable.createdAt,
      userId: lessonQuestionsTable.userId,
      userName: usersTable.name,
    })
    .from(lessonQuestionsTable)
    .innerJoin(usersTable, eq(lessonQuestionsTable.userId, usersTable.id))
    .where(eq(lessonQuestionsTable.videoId, videoId))
    .orderBy(asc(lessonQuestionsTable.createdAt));

  const questionsWithAnswers = await Promise.all(
    questions.map(async (q) => {
      const answers = await db
        .select({
          id: lessonAnswersTable.id,
          answerText: lessonAnswersTable.answerText,
          createdAt: lessonAnswersTable.createdAt,
          userId: lessonAnswersTable.userId,
          userName: usersTable.name,
        })
        .from(lessonAnswersTable)
        .innerJoin(usersTable, eq(lessonAnswersTable.userId, usersTable.id))
        .where(eq(lessonAnswersTable.questionId, Number(q.id)))
        .orderBy(asc(lessonAnswersTable.createdAt));

      return {
        id: Number(q.id),
        questionText: q.questionText,
        createdAt: q.createdAt,
        userId: Number(q.userId),
        userName: q.userName,
        answers: answers.map((a) => ({
          id: Number(a.id),
          answerText: a.answerText,
          createdAt: a.createdAt,
          userId: Number(a.userId),
          userName: a.userName,
        })),
      };
    }),
  );

  res.json({ questions: questionsWithAnswers });
});

// POST /api/answers
router.post("/answers", requireAuth, async (req, res) => {
  const { question_id, answer_text } = req.body;
  if (!question_id || !answer_text?.trim()) {
    res.status(400).json({ error: "bad_request", message: "question_id and answer_text are required" });
    return;
  }

  const questionId = Number(question_id);

  // Get the video that owns this question
  const [question] = await db
    .select({ videoId: lessonQuestionsTable.videoId })
    .from(lessonQuestionsTable)
    .where(eq(lessonQuestionsTable.id, questionId));

  if (!question) {
    res.status(404).json({ error: "not_found", message: "Question not found" });
    return;
  }

  if (!(await isEnrolledForVideo(req.userId!, Number(question.videoId)))) {
    res.status(403).json({ error: "forbidden", message: "You must be enrolled to answer questions" });
    return;
  }

  const [answer] = await db
    .insert(lessonAnswersTable)
    .values({ questionId, userId: req.userId!, answerText: answer_text.trim() })
    .returning();

  res.status(201).json({ answer });
});

export default router;
