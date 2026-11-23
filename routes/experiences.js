const express = require('express');
const db = require('../db');
const { toId, isFilled, isValidDate, findExperience, sendServerError } = require('../helpers');

const router = express.Router();

// DB에서 꺼낸 경험 한 줄을 API 응답 모양으로 바꾼다
function formatExperience(row) {
  return {
    experienceId: toId('exp', row.id),
    industry: row.industry,
    jobTitle: row.job_title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    isCurrent: row.is_current === 1,
    description: row.description,
  };
}

// 경험 입력값을 검사하고, 잘못된 항목 목록을 돌려준다 (문제가 없으면 빈 배열)
function validateExperience(experience) {
  const errors = [];

  if (!isFilled(experience.industry)) {
    errors.push({ field: 'industry', message: '업종을 입력해 주세요.' });
  } else if (experience.industry.length > 50) {
    errors.push({ field: 'industry', message: '업종은 50자 이하로 입력해 주세요.' });
  }

  if (!isFilled(experience.jobTitle)) {
    errors.push({ field: 'jobTitle', message: '담당 업무를 입력해 주세요.' });
  } else if (experience.jobTitle.length > 50) {
    errors.push({ field: 'jobTitle', message: '담당 업무는 50자 이하로 입력해 주세요.' });
  }

  if (!isFilled(experience.description)) {
    errors.push({ field: 'description', message: '업무 설명을 입력해 주세요.' });
  } else if (experience.description.length > 1000) {
    errors.push({ field: 'description', message: '업무 설명은 1000자 이하로 입력해 주세요.' });
  }

  if (typeof experience.isCurrent !== 'boolean') {
    errors.push({ field: 'isCurrent', message: '재직 중 여부는 true 또는 false로 보내 주세요.' });
  }

  if (!isValidDate(experience.startedAt)) {
    errors.push({ field: 'startedAt', message: '시작일을 YYYY-MM-DD 형식으로 입력해 주세요.' });
  }

  // 재직 중이 아니면 종료일이 꼭 필요하다
  if (experience.isCurrent === false) {
    if (!isValidDate(experience.endedAt)) {
      errors.push({ field: 'endedAt', message: '종료일을 YYYY-MM-DD 형식으로 입력해 주세요.' });
    } else if (isValidDate(experience.startedAt) && experience.startedAt > experience.endedAt) {
      errors.push({ field: 'endedAt', message: '종료일은 시작일보다 빠를 수 없습니다.' });
    }
  }

  return errors;
}

// 경험 목록 조회: GET /api/experiences?page=1&limit=10
router.get('/', (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_QUERY_PARAMETER',
      message: '페이지 조회 조건이 올바르지 않습니다.',
    });
  }

  try {
    const offset = (page - 1) * limit;
    const rows = db.prepare('SELECT * FROM experiences ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) AS total FROM experiences').get().total;

    // 목록에서는 긴 업무 설명(description)을 빼고 요약만 보낸다
    const data = rows.map((row) => {
      const experience = formatExperience(row);
      delete experience.description;
      return experience;
    });

    res.json({
      success: true,
      data: data,
      pagination: { page: page, limit: limit, total: total },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 경험 등록: POST /api/experiences
router.post('/', (req, res) => {
  const body = req.body || {};
  const experience = {
    industry: body.industry,
    jobTitle: body.jobTitle,
    description: body.description,
    startedAt: body.startedAt,
    endedAt: body.endedAt,
    isCurrent: body.isCurrent === undefined ? false : body.isCurrent,
  };

  const errors = validateExperience(experience);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EXPERIENCE_INPUT',
      message: '경험 정보를 확인해 주세요.',
      errors: errors,
    });
  }

  // 재직 중이면 종료일은 비워 둔다
  if (experience.isCurrent) {
    experience.endedAt = null;
  }

  try {
    const result = db
      .prepare('INSERT INTO experiences (industry, job_title, description, started_at, ended_at, is_current) VALUES (?, ?, ?, ?, ?, ?)')
      .run(experience.industry, experience.jobTitle, experience.description, experience.startedAt, experience.endedAt, experience.isCurrent ? 1 : 0);
    const row = db.prepare('SELECT * FROM experiences WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: '경험이 등록되었습니다.',
      data: formatExperience(row),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 경험 상세 조회: GET /api/experiences/exp_1
router.get('/:experienceId', (req, res) => {
  try {
    const found = findExperience(req.params.experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '해당 경험을 찾을 수 없습니다.',
      });
    }

    res.json({ success: true, data: formatExperience(found) });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 경험 수정: PATCH /api/experiences/exp_1 (보낸 항목만 바뀐다)
router.patch('/:experienceId', (req, res) => {
  const body = req.body || {};
  const allowedFields = ['industry', 'jobTitle', 'description', 'startedAt', 'endedAt', 'isCurrent'];
  const changedFields = Object.keys(body).filter((key) => allowedFields.includes(key));

  try {
    const found = findExperience(req.params.experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '해당 경험을 찾을 수 없습니다.',
      });
    }

    if (changedFields.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EXPERIENCE_INPUT',
        message: '수정할 항목을 보내 주세요.',
      });
    }

    // 기존 값에 보낸 값만 덮어쓴 뒤, 전체를 다시 검사한다
    const experience = formatExperience(found);
    for (const field of changedFields) {
      experience[field] = body[field];
    }

    const errors = validateExperience(experience);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EXPERIENCE_INPUT',
        message: '경험 정보를 확인해 주세요.',
        errors: errors,
      });
    }

    if (experience.isCurrent) {
      experience.endedAt = null;
    }

    db.prepare(
      "UPDATE experiences SET industry = ?, job_title = ?, description = ?, started_at = ?, ended_at = ?, is_current = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(experience.industry, experience.jobTitle, experience.description, experience.startedAt, experience.endedAt, experience.isCurrent ? 1 : 0, found.id);
    const row = db.prepare('SELECT * FROM experiences WHERE id = ?').get(found.id);

    res.json({
      success: true,
      message: '경험 정보가 수정되었습니다.',
      data: formatExperience(row),
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 경험 삭제: DELETE /api/experiences/exp_1 (연결된 변환 결과도 같이 삭제된다)
router.delete('/:experienceId', (req, res) => {
  try {
    const found = findExperience(req.params.experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '해당 경험을 찾을 수 없습니다.',
      });
    }

    db.prepare('DELETE FROM experiences WHERE id = ?').run(found.id);

    res.json({ success: true, message: '경험이 삭제되었습니다.' });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 역량 변환: POST /api/experiences/exp_1/conversions
// 업무 설명에 들어 있는 키워드를 변환 규칙과 비교해서 역량과 문장 초안을 만든다 (저장은 하지 않는다)
router.post('/:experienceId/conversions', (req, res) => {
  try {
    const found = findExperience(req.params.experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '해당 경험을 찾을 수 없습니다.',
      });
    }

    if (found.description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        code: 'CONVERSION_INPUT_INVALID',
        message: '역량으로 변환할 수 있는 경험 정보가 부족합니다.',
      });
    }

    // "고객 응대 및 주문 처리" -> ["고객 응대", "주문 처리"] 처럼 업무를 나눈다
    const phrases = found.description
      .split(/,|\.|\n| 및 /)
      .map((phrase) => phrase.trim())
      .filter((phrase) => phrase !== '');

    const rules = db
      .prepare('SELECT r.keyword, c.id, c.name FROM conversion_rules r JOIN competencies c ON r.competency_id = c.id ORDER BY c.id, r.id')
      .all();

    const competencies = [];
    const evidences = [];
    for (const rule of rules) {
      const phrase = phrases.find((p) => p.includes(rule.keyword));
      const alreadyAdded = competencies.find((c) => c.competencyId === rule.id);
      if (!phrase || alreadyAdded) {
        continue;
      }

      // 근거(evidence)는 사용자가 직접 쓴 문장을 그대로 사용한다 (없는 내용을 지어내지 않기 위해)
      competencies.push({ competencyId: rule.id, name: rule.name, evidence: phrase });
      if (!evidences.includes(phrase)) {
        evidences.push(phrase);
      }
    }

    if (competencies.length === 0) {
      return res.json({
        success: true,
        message: '일치하는 역량을 찾지 못했습니다. 업무 내용을 더 구체적으로 적어 주세요.',
        data: { competencies: [], draftSentence: '' },
      });
    }

    const draftSentence = found.industry + ' 근무를 통해 ' + evidences.join(', ') + ' 경험을 쌓았습니다.';

    res.json({
      success: true,
      message: '역량 변환이 완료되었습니다.',
      data: { competencies: competencies, draftSentence: draftSentence },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 변환 결과 목록 조회: GET /api/experiences/exp_1/conversions
router.get('/:experienceId/conversions', (req, res) => {
  try {
    const found = findExperience(req.params.experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '해당 경험을 찾을 수 없습니다.',
      });
    }

    const rows = db.prepare('SELECT * FROM conversions WHERE experience_id = ? ORDER BY id DESC').all(found.id);
    const allCompetencies = db.prepare('SELECT id, name FROM competencies').all();

    const data = rows.map((row) => {
      // DB에는 '["comp_001"]' 같은 문자열로 저장되어 있어서 배열로 바꾼 뒤, 역량 이름을 붙인다
      const competencyIds = JSON.parse(row.competency_ids);
      const competencies = competencyIds.map((competencyId) => {
        const competency = allCompetencies.find((c) => c.id === competencyId);
        return { competencyId: competencyId, name: competency ? competency.name : null };
      });

      return {
        conversionId: toId('conv', row.id),
        competencies: competencies,
        draftSentence: row.draft_sentence,
        finalSentence: row.final_sentence,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    res.json({ success: true, data: data });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
