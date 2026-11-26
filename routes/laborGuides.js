const express = require('express');
const db = require('../db');
const { sendServerError } = require('../helpers');

const router = express.Router();

// 조회할 수 있는 근로 안내 주제
const TOPICS = ['contract', 'payslip', 'wage', 'workHours', 'breakTime'];

// 근로조건 점검 정보 조회: GET /api/labor-guides 또는 GET /api/labor-guides?topic=wage
router.get('/', (req, res) => {
  const topic = req.query.topic;

  if (topic !== undefined && !TOPICS.includes(topic)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TOPIC',
      message: '지원하지 않는 점검 주제입니다.',
    });
  }

  try {
    let rows;
    if (topic === undefined) {
      rows = db.prepare('SELECT * FROM labor_guides ORDER BY id').all();
    } else {
      rows = db.prepare('SELECT * FROM labor_guides WHERE topic = ? ORDER BY id').all(topic);
    }

    const data = rows.map((row) => ({
      guideId: row.id,
      topic: row.topic,
      title: row.title,
      description: row.description,
      checkItems: JSON.parse(row.check_items),
      officialSourceUrl: row.official_source_url,
      lastCheckedAt: row.last_checked_at,
    }));

    if (data.length === 0) {
      return res.json({ success: true, message: '확인 가능한 정보가 없습니다.', data: [] });
    }

    res.json({ success: true, data: data });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
