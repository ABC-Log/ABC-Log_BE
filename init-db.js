// 스키마와 기준 데이터로 DB를 초기화한다
const fs = require('fs');
const path = require('path');
const db = require('./db');

try {
  const schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'sql', 'seed.sql'), 'utf8');

  db.exec(schema);
  console.log('테이블을 만들었습니다.');
  db.exec(seed);
  console.log('기준 데이터를 넣었습니다.');
} catch (error) {
  console.error('DB 초기화 실패:', error.message);
  process.exit(1);
}
