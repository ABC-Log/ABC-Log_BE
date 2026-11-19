const path = require('path');
const Database = require('better-sqlite3');

// SQLite는 DB 전체가 파일 하나(abclog.db)에 저장된다. 파일이 없으면 새로 만든다.
const db = new Database(path.join(__dirname, 'abclog.db'));

// SQLite는 외래키 검사가 기본으로 꺼져 있어서 켜 준다 (ON DELETE CASCADE가 동작하려면 필요)
db.pragma('foreign_keys = ON');

module.exports = db;
