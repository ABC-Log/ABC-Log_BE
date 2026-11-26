const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { toId, isFilled, sendServerError } = require("../helpers");
const { hashToken, requireAuth } = require("../auth");

const router = express.Router();

// salt를 붙여 비밀번호를 scrypt로 해시한다
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return "scrypt$" + salt + "$" + hash;
}

// 입력한 비밀번호를 저장된 해시와 비교한다
function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = crypto.scryptSync(password, parts[1], expected.length);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

// 회원가입: POST /api/users/signup
router.post("/signup", (req, res) => {
  const body = req.body || {};
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (
    !isFilled(email) ||
    !email.includes("@") ||
    !isFilled(password) ||
    password.length < 8 ||
    password.length > 200 ||
    !name ||
    name.length > 50
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_SIGNUP_INPUT",
      message: "이메일, 8자 이상 비밀번호, 이름을 올바르게 입력해 주세요.",
    });
  }

  try {
    const result = db
      .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
      .run(email, hashPassword(password), name);

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다. 로그인해 주세요.",
      data: {
        userId: toId("user", result.lastInsertRowid),
        email: email,
        name: name,
      },
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({
          success: false,
          code: "EMAIL_ALREADY_EXISTS",
          message: "이미 가입된 이메일입니다.",
        });
    }
    sendServerError(res, error);
  }
});

// 로그인: POST /api/users/login
router.post("/login", (req, res) => {
  const body = req.body || {};
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;

  if (!isFilled(email) || !isFilled(password)) {
    return res
      .status(400)
      .json({
        success: false,
        code: "INVALID_LOGIN_INPUT",
        message: "이메일과 비밀번호를 입력해 주세요.",
      });
  }

  try {
    const user = db
      .prepare(
        "SELECT id, email, name, password FROM users WHERE lower(email) = ?",
      )
      .get(email);
    if (!user || !verifyPassword(password, user.password)) {
      return res
        .status(401)
        .json({
          success: false,
          code: "LOGIN_FAILED",
          message: "이메일 또는 비밀번호가 올바르지 않습니다.",
        });
    }

    // 새 로그인마다 access/refresh 토큰 한 쌍을 발급한다
    const sessionId = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const accessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.transaction(() => {
      // 새 로그인은 같은 계정의 이전 로그인 세션을 종료한다
      const now = new Date().toISOString();
      db.prepare(
        "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE user_id = ? AND revoked_at IS NULL",
      ).run(now, user.id);
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(user.id);

      db.prepare(
        "INSERT INTO auth_tokens (token_hash, user_id, session_id, expires_at) VALUES (?, ?, ?, ?)",
      ).run(hashToken(accessToken), user.id, sessionId, accessTokenExpiresAt);
      db.prepare(
        "INSERT INTO refresh_tokens (token_hash, family_id, user_id, expires_at) VALUES (?, ?, ?, ?)",
      ).run(hashToken(refreshToken), sessionId, user.id, refreshTokenExpiresAt);
    })();

    res.json({
      success: true,
      message: "로그인되었습니다.",
      data: {
        userId: toId("user", user.id),
        email: user.email,
        name: user.name,
        accessToken: accessToken,
        tokenType: "Bearer",
        accessTokenExpiresAt: accessTokenExpiresAt,
        refreshToken: refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 토큰 갱신: POST /api/users/refresh
// 기존 refresh token은 폐기하고 새 토큰 쌍을 발급한다
router.post("/refresh", (req, res) => {
  const refreshToken = req.body && req.body.refreshToken;
  if (!isFilled(refreshToken)) {
    return res.status(400).json({
      success: false,
      code: "REFRESH_TOKEN_REQUIRED",
      message: "refreshToken을 보내 주세요.",
    });
  }

  const now = new Date().toISOString();
  const refreshTokenHash = hashToken(refreshToken);

  try {
    const result = db.transaction(() => {
      const saved = db.prepare(
        "SELECT * FROM refresh_tokens WHERE token_hash = ?",
      ).get(refreshTokenHash);

      if (!saved) return { error: "INVALID_REFRESH_TOKEN" };

      if (saved.revoked_at) {
        db.prepare(
          "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE family_id = ?",
        ).run(now, saved.family_id);
        db.prepare("DELETE FROM auth_tokens WHERE session_id = ?").run(saved.family_id);
        return { error: "REFRESH_TOKEN_REUSED" };
      }

      if (saved.expires_at <= now) {
        db.prepare(
          "UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?",
        ).run(now, refreshTokenHash);
        db.prepare("DELETE FROM auth_tokens WHERE session_id = ?").run(saved.family_id);
        return { error: "REFRESH_TOKEN_EXPIRED" };
      }

      const nextAccessToken = crypto.randomBytes(32).toString("hex");
      const nextRefreshToken = crypto.randomBytes(32).toString("hex");
      const nextAccessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const nextRefreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const nextRefreshHash = hashToken(nextRefreshToken);

      db.prepare(
        "UPDATE refresh_tokens SET revoked_at = ?, replaced_by_hash = ? WHERE token_hash = ?",
      ).run(now, nextRefreshHash, refreshTokenHash);
      db.prepare(
        "INSERT INTO refresh_tokens (token_hash, family_id, user_id, expires_at) VALUES (?, ?, ?, ?)",
      ).run(nextRefreshHash, saved.family_id, saved.user_id, nextRefreshExpiresAt);
      db.prepare(
        "INSERT INTO auth_tokens (token_hash, user_id, session_id, expires_at) VALUES (?, ?, ?, ?)",
      ).run(hashToken(nextAccessToken), saved.user_id, saved.family_id, nextAccessExpiresAt);

      return {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        accessTokenExpiresAt: nextAccessExpiresAt,
        refreshTokenExpiresAt: nextRefreshExpiresAt,
      };
    })();

    if (result.error) {
      const reused = result.error === "REFRESH_TOKEN_REUSED";
      const expired = result.error === "REFRESH_TOKEN_EXPIRED";
      return res.status(401).json({
        success: false,
        code: result.error,
        message: reused
          ? "이미 사용한 refresh token입니다. 다시 로그인해 주세요."
          : expired
            ? "refresh token이 만료되었습니다. 다시 로그인해 주세요."
            : "refresh token이 올바르지 않습니다.",
      });
    }

    res.json({
      success: true,
      message: "토큰이 갱신되었습니다.",
      data: { ...result, tokenType: "Bearer" },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 로그아웃: POST /api/users/logout
router.post("/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
  try {
    db.transaction(() => {
      db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(hashToken(token));
      if (req.sessionId) {
        const now = new Date().toISOString();
        db.prepare(
          "UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE family_id = ?",
        ).run(now, req.sessionId);
        db.prepare("DELETE FROM auth_tokens WHERE session_id = ?").run(req.sessionId);
      }
    })();
    res.json({ success: true, message: "로그아웃되었습니다." });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
