const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

// DB 파일을 열고, 없으면 새로 만든다
const db = new Database(path.join(__dirname, 'abclog.db'));

// 삭제 시 연결된 데이터도 정리되도록 외래 키를 켠다
db.pragma('foreign_keys = ON');

// 기존 DB에 사용자 연결과 토큰 테이블을 추가한다
const experienceColumns = db.prepare('PRAGMA table_info(experiences)').all().map((column) => column.name);
if (experienceColumns.length > 0 && !experienceColumns.includes('user_id')) {
  db.exec('ALTER TABLE experiences ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

const tokenColumns = db.prepare('PRAGMA table_info(auth_tokens)').all().map((column) => column.name);
if (!tokenColumns.includes('session_id')) {
  db.exec('ALTER TABLE auth_tokens ADD COLUMN session_id TEXT');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by_hash TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// 기존 평문 비밀번호를 scrypt 해시로 바꾼다
const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
if (usersTableExists) {
  const users = db.prepare('SELECT id, password FROM users').all();
  const updatePassword = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  const migratePasswords = db.transaction(() => {
    for (const user of users) {
      if (!user.password.startsWith('scrypt$')) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(user.password, salt, 64).toString('hex');
        updatePassword.run('scrypt$' + salt + '$' + hash, user.id);
      }
    }
  });
  migratePasswords();
}

module.exports = db;
