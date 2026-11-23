const db = require('./db');

// DB의 숫자 id(1)를 API에서 쓰는 문자열 id('exp_1')로 바꾼다
function toId(prefix, id) {
  return prefix + '_' + id;
}

// API의 문자열 id('exp_1')를 DB의 숫자 id(1)로 바꾼다. 형식이 틀리면 null
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

// 비어 있지 않은 문자열인지 확인한다
function isFilled(text) {
  return typeof text === 'string' && text.trim() !== '';
}

// '2026-01-01' 형식의 실제 있는 날짜인지 확인한다 ('2026-02-30' 같은 날짜는 false)
function isValidDate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const date = new Date(text);
  return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

// 경험 ID('exp_1')로 경험 한 개를 찾는다. 없으면 null
function findExperience(experienceId) {
  const id = parseId('exp', experienceId);
  if (id === null) {
    return null;
  }
  const row = db.prepare('SELECT * FROM experiences WHERE id = ?').get(id);
  return row || null;
}

// 서버 오류(500) 응답을 보낸다
function sendServerError(res, error, message) {
  console.error(error);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: message || '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  });
}

module.exports = { toId, parseId, isFilled, isValidDate, findExperience, sendServerError };
