const express = require('express');
const db = require('../db');
const { sendServerError } = require('../helpers');

const router = express.Router();

// 역량 목록 조회: GET /api/competencies
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, description FROM competencies ORDER BY id').all();

    const data = rows.map((row) => ({
      competencyId: row.id,
      name: row.name,
      description: row.description,
    }));

    res.json({ success: true, data: data });
  } catch (error) {
    sendServerError(res, error, '역량 목록을 불러오지 못했습니다.');
  }
});

module.exports = router;
