-- ABCLog 테이블 만들기 (SQLite)
-- 주의: 다시 실행하면 기존 테이블과 데이터가 모두 지워지고 새로 만들어진다.
-- SQLite에는 JSON, BOOLEAN, DATE 타입이 없어 TEXT와 INTEGER로 저장한다.

DROP TABLE IF EXISTS conversions;
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS conversion_rules;
DROP TABLE IF EXISTS experiences;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS labor_guides;
DROP TABLE IF EXISTS competencies;
DROP TABLE IF EXISTS users;

-- 회원
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- 비밀번호 해시
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 아르바이트 경험
CREATE TABLE experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  industry TEXT NOT NULL,           -- 업종 (예: 카페)
  job_title TEXT NOT NULL,          -- 담당 업무 (예: 매장 직원)
  description TEXT NOT NULL,        -- 구체적인 업무 설명
  started_at TEXT NOT NULL,         -- 예: '2026-01-01'
  ended_at TEXT,                    -- 재직 중이면 NULL
  is_current INTEGER NOT NULL DEFAULT 0, -- 재직 중이면 1, 아니면 0
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 역량 (기준 데이터)
CREATE TABLE competencies (
  id TEXT PRIMARY KEY,              -- 예: comp_001
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

-- 역량 변환 규칙: 업무 설명에 keyword가 들어 있으면 해당 역량으로 연결 (기준 데이터)
CREATE TABLE conversion_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  competency_id TEXT NOT NULL,
  FOREIGN KEY (competency_id) REFERENCES competencies(id)
);

-- 직무 (기준 데이터)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,              -- 예: job_001
  name TEXT NOT NULL,
  main_tasks TEXT NOT NULL,         -- JSON 문자열: ["고객 문의 응대", "문의 내용 안내"]
  competency_ids TEXT NOT NULL,     -- JSON 문자열: ["comp_001", "comp_002"]
  experience_example TEXT NOT NULL
);

-- 근로조건 점검 안내 (기준 데이터)
CREATE TABLE labor_guides (
  id TEXT PRIMARY KEY,              -- 예: guide_001
  topic TEXT NOT NULL,              -- contract, payslip, wage, workHours, breakTime
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  check_items TEXT NOT NULL,        -- JSON 문자열
  official_source_url TEXT NOT NULL,
  last_checked_at TEXT NOT NULL
);

-- 역량 변환 결과 (경험이 삭제되면 같이 삭제된다)
CREATE TABLE conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL,
  competency_ids TEXT NOT NULL,     -- JSON 문자열: ["comp_001", "comp_002"]
  draft_sentence TEXT NOT NULL,     -- 시스템이 만든 문장 초안
  final_sentence TEXT NOT NULL,     -- 사용자가 수정한 최종 문장
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
);

-- 로그인 토큰은 해시와 만료 시간만 저장한다
CREATE TABLE auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- refresh 토큰은 교체 이력을 남겨 재사용을 확인한다
CREATE TABLE refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  replaced_by_hash TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
