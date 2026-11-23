const express = require('express');
const db = require('../db');
const { toId, parseId, isFilled, findExperience, sendServerError } = require('../helpers');

const router = express.Router();

// 변환 결과 저장: POST /api/conversions
router.post('/', (req, res) => {
  const body = req.body || {};
  const experienceId = body.experienceId;
  const competencyIds = body.competencyIds;
  const draftSentence = body.draftSentence;
  const finalSentence = body.finalSentence;

  const isValidInput =
    typeof experienceId === 'string' &&
    Array.isArray(competencyIds) &&
    competencyIds.length > 0 &&
    competencyIds.every((id) => typeof id === 'string') &&
    isFilled(draftSentence) &&
    isFilled(finalSentence) &&
    draftSentence.length <= 500 &&
    finalSentence.length <= 500;

  if (!isValidInput) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_CONVERSION_INPUT',
      message: '저장할 변환 결과를 확인해 주세요.',
    });
  }

  try {
    const found = findExperience(experienceId);
    if (!found) {
      return res.status(404).json({
        success: false,
        code: 'EXPERIENCE_NOT_FOUND',
        message: '경험 또는 역량 정보를 확인할 수 없습니다.',
      });
    }

    // 같은 역량 ID가 두 번 들어오면 하나로 합친다
    const uniqueIds = [...new Set(competencyIds)];

    // 역량 ID가 모두 실제로 있는지 하나씩 확인한다
    for (const competencyId of uniqueIds) {
      const competency = db.prepare('SELECT id FROM competencies WHERE id = ?').get(competencyId);
      if (!competency) {
        return res.status(404).json({
          success: false,
          code: 'COMPETENCY_NOT_FOUND',
          message: '경험 또는 역량 정보를 확인할 수 없습니다.',
        });
      }
    }

    const result = db
      .prepare('INSERT INTO conversions (experience_id, competency_ids, draft_sentence, final_sentence) VALUES (?, ?, ?, ?)')
      .run(found.id, JSON.stringify(uniqueIds), draftSentence, finalSentence);

    res.status(201).json({
      success: true,
      message: '변환 결과가 저장되었습니다.',
      data: {
        conversionId: toId('conv', result.lastInsertRowid),
        experienceId: toId('exp', found.id),
        competencyIds: uniqueIds,
        draftSentence: draftSentence,
        finalSentence: finalSentence,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 변환 결과 문장 수정: PATCH /api/conversions/conv_1 (draftSentence는 그대로 두고 finalSentence만 바꾼다)
router.patch('/:conversionId', (req, res) => {
  const body = req.body || {};
  const finalSentence = body.finalSentence;

  try {
    const id = parseId('conv', req.params.conversionId);
    let conversion = null;
    if (id !== null) {
      conversion = db.prepare('SELECT * FROM conversions WHERE id = ?').get(id);
    }
    if (!conversion) {
      return res.status(404).json({
        success: false,
        code: 'CONVERSION_NOT_FOUND',
        message: '변환 결과를 찾을 수 없습니다.',
      });
    }

    if (!isFilled(finalSentence) || finalSentence.length > 500) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SENTENCE',
        message: '최종 문장을 500자 이하로 입력해 주세요.',
      });
    }

    db.prepare("UPDATE conversions SET final_sentence = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(finalSentence, id);

    res.json({
      success: true,
      message: '변환 문장이 저장되었습니다.',
      data: { conversionId: toId('conv', id), finalSentence: finalSentence },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
