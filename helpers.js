const db = require('./db');

// DB ID를 API용 문자열 ID로 바꾼다
function toId(prefix, id) {
  return prefix + '_' + id;
}

// API ID를 DB 숫자 ID로 바꾼다. 형식이 틀리면 null을 반환한다
function parseId(prefix, value) {
  if (typeof value !== 'string' || !value.startsWith(prefix + '_')) {
    return null;
  }
  const id = Number(value.slice(prefix.length + 1));
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  return id;
}

// 공백을 제외하고 문자가 있는지 확인한다
function isFilled(text) {
  return typeof text === 'string' && text.trim() !== '';
}

// YYYY-MM-DD 형식의 실제 날짜인지 확인한다
function isValidDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const date = new Date(text);
  return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

// 경험 ID로 DB에서 경험을 찾는다
function findExperience(experienceId) {
  const id = parseId('exp', experienceId);
  if (id === null) {
    return null;
  }
  const row = db.prepare('SELECT * FROM experiences WHERE id = ?').get(id);
  return row || null;
}

// 공통 서버 오류를 응답한다
function sendServerError(res, error, message) {
  console.error(error);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: message || '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  });
}

module.exports = { toId, parseId, isFilled, isValidDate, findExperience, sendServerError };
