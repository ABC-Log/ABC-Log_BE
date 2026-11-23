const express = require('express');
const db = require('../db');
const { sendServerError } = require('../helpers');

const router = express.Router();

// 직무 기준 데이터 조회: GET /api/jobs/catalog
router.get('/catalog', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM jobs ORDER BY id').all();

    // main_tasks, competency_ids는 JSON 문자열로 저장되어 있어서 배열로 바꾼다
    const data = rows.map((row) => ({
      jobId: row.id,
      name: row.name,
      mainTasks: JSON.parse(row.main_tasks),
      competencyIds: JSON.parse(row.competency_ids),
    }));

    res.json({ success: true, data: data });
  } catch (error) {
    sendServerError(res, error, '직무 기준 데이터를 불러오지 못했습니다.');
  }
});

// 역량 기반 직무 추천: GET /api/jobs/recommendations?competencyIds=comp_001,comp_002
router.get('/recommendations', (req, res) => {
  const text = typeof req.query.competencyIds === 'string' ? req.query.competencyIds : '';
  // "comp_001,comp_002" -> ["comp_001", "comp_002"]
  const selectedIds = text
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');

  if (selectedIds.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'COMPETENCY_REQUIRED',
      message: '추천받을 역량을 선택해 주세요.',
    });
  }

  try {
    const allCompetencies = db.prepare('SELECT id, name FROM competencies').all();

    // 선택한 역량 ID가 모두 실제로 있는지 확인
    for (const id of selectedIds) {
      if (!allCompetencies.find((c) => c.id === id)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_COMPETENCY_ID',
          message: '올바르지 않은 역량 ID가 있습니다: ' + id,
        });
      }
    }

    // 역량 ID를 이름으로 바꾸는 함수
    function getName(competencyId) {
      const competency = allCompetencies.find((c) => c.id === competencyId);
      return competency ? competency.name : competencyId;
    }

    const jobs = db.prepare('SELECT * FROM jobs ORDER BY id').all();

    const recommendations = [];
    for (const job of jobs) {
      const jobCompetencyIds = JSON.parse(job.competency_ids);

      // 이 직무에 필요한 역량 중 사용자가 선택한 역량만 골라낸다
      const matchedIds = jobCompetencyIds.filter((id) => selectedIds.includes(id));
      if (matchedIds.length === 0) {
        continue;
      }

      recommendations.push({
        jobId: job.id,
        name: job.name,
        mainTasks: JSON.parse(job.main_tasks),
        competencies: jobCompetencyIds.map(getName),
        experienceExample: job.experience_example,
        matchedCompetencies: matchedIds.map(getName),
        reason: '선택한 역량 중 ' + matchedIds.length + '개가 해당 직무의 요구 역량과 일치합니다.',
      });
    }

    // 일치하는 역량이 많은 직무부터 보여준다
    recommendations.sort((a, b) => b.matchedCompetencies.length - a.matchedCompetencies.length);

    if (recommendations.length === 0) {
      return res.json({ success: true, message: '선택한 역량과 연결된 직무가 없습니다.', data: [] });
    }

    res.json({ success: true, data: recommendations });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
