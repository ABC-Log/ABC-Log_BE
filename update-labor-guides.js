// 근로 안내의 출처와 확인 날짜만 갱신한다
const fs = require('fs');
const path = require('path');
const db = require('./db');

try {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', 'update-labor-guides.sql'), 'utf8');
  db.transaction(() => db.exec(sql))();
  console.log('노동 안내 출처와 확인 날짜를 갱신했습니다.');
} catch (error) {
  console.error('노동 안내 갱신 실패:', error.message);
  process.exit(1);
}
