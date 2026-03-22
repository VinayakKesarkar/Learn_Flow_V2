import { Router } from "express";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { hashPassword, comparePassword } from "../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, getRefreshTokenExpiresAt } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

const COOKIE_NAME = "refreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "validation_error", message: "email, password, and name are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "validation_error", message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "Email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();

  const accessToken = signAccessToken({ userId: Number(user.id), email: user.email });
  const refreshToken = signRefreshToken({ userId: Number(user.id), email: user.email });

  await db.insert(refreshTokensTable).values({
    userId: Number(user.id),
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
  });

  res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
  res.status(201).json({
    accessToken,
    user: { id: Number(user.id), email: user.email, name: user.name, createdAt: user.createdAt },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "validation_error", message: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken({ userId: Number(user.id), email: user.email });
  const refreshToken = signRefreshToken({ userId: Number(user.id), email: user.email });

  await db.insert(refreshTokensTable).values({
    userId: Number(user.id),
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
  });

  res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
  res.json({
    accessToken,
    user: { id: Number(user.id), email: user.email, name: user.name, createdAt: user.createdAt },
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "No refresh token" });
    return;
  }

  let payload: { userId: number; email: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired refresh token" });
    return;
  }

  const tokenHash = hashToken(token);
  const [stored] = await db
    .select()
    .from(refreshTokensTable)
    .where(
      and(
        eq(refreshTokensTable.userId, payload.userId),
        eq(refreshTokensTable.tokenHash, tokenHash),
        isNull(refreshTokensTable.revokedAt),
        gt(refreshTokensTable.expiresAt, new Date()),
      ),
    );

  if (!stored) {
    res.status(401).json({ error: "unauthorized", message: "Refresh token revoked or not found" });
    return;
  }

  // Rotation: revoke old, issue new
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, stored.id));

  const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
  const newRefreshToken = signRefreshToken({ userId: payload.userId, email: payload.email });

  await db.insert(refreshTokensTable).values({
    userId: payload.userId,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
  });

  res.cookie(COOKIE_NAME, newRefreshToken, cookieOptions);
  res.json({ accessToken: newAccessToken });
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const tokenHash = hashToken(token);
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.userId, req.userId!),
          eq(refreshTokensTable.tokenHash, tokenHash),
        ),
      );
  }
  res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  res.json({ id: Number(user.id), email: user.email, name: user.name, createdAt: user.createdAt });
});

export default router;
