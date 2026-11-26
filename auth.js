const crypto = require("crypto");
const db = require("./db");

// 토큰 원문은 저장하지 않고 해시만 보관한다
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Bearer 토큰으로 로그인 사용자를 확인한다
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res
      .status(401)
      .json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
      });
  }

  try {
    const user = db
      .prepare(
        `
        SELECT users.id, users.email, users.name, auth_tokens.session_id
      FROM auth_tokens
      JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token_hash = ? AND auth_tokens.expires_at > ?
    `,
      )
      .get(hashToken(match[1]), new Date().toISOString());

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          code: "INVALID_TOKEN",
          message: "로그인 정보가 만료되었거나 올바르지 않습니다.",
        });
    }

    req.user = user;
    req.sessionId = user.session_id;
    next();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "로그인 정보를 확인하지 못했습니다.",
      });
  }
}

module.exports = { hashToken, requireAuth };
