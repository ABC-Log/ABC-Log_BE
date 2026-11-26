const express = require("express");
const db = require("../db");
const {
  toId,
  parseId,
  isFilled,
  findExperience,
  sendServerError,
} = require("../helpers");

const router = express.Router();

// 변환 결과 저장: POST /api/conversions
router.post("/", (req, res) => {
  const body = req.body || {};
  const experienceId = body.experienceId;
  const competencyIds = Array.isArray(body.competencyIds)
    ? body.competencyIds
    : Array.isArray(body.competencies)
      ? body.competencies.map((item) => item && item.competencyId)
      : null;
  const draftSentence =
    typeof body.draftSentence === "string" ? body.draftSentence.trim() : "";
  const finalSentence =
    body.finalSentence === undefined
      ? draftSentence
      : typeof body.finalSentence === "string"
        ? body.finalSentence.trim()
        : "";

  const isValidInput =
    typeof experienceId === "string" &&
    Array.isArray(competencyIds) &&
    competencyIds.length > 0 &&
    competencyIds.every((id) => typeof id === "string") &&
    isFilled(draftSentence) &&
    isFilled(finalSentence) &&
    draftSentence.length <= 1000 &&
    finalSentence.length <= 1000;

  if (!isValidInput) {
    return res.status(400).json({
      success: false,
      code: "INVALID_CONVERSION_INPUT",
      message: "저장할 변환 결과를 확인해 주세요.",
    });
  }

  try {
    const found = findExperience(experienceId);
    if (!found || found.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        code: "EXPERIENCE_NOT_FOUND",
        message: "경험 또는 역량 정보를 확인할 수 없습니다.",
      });
    }

    // 중복된 역량 ID를 정리한다
    const uniqueIds = [...new Set(competencyIds)];

    // 모든 역량 ID가 등록되어 있는지 확인한다
    for (const competencyId of uniqueIds) {
      const competency = db
        .prepare("SELECT id FROM competencies WHERE id = ?")
        .get(competencyId);
      if (!competency) {
        return res.status(404).json({
          success: false,
          code: "COMPETENCY_NOT_FOUND",
          message: "경험 또는 역량 정보를 확인할 수 없습니다.",
        });
      }
    }

    const result = db
      .prepare(
        "INSERT INTO conversions (experience_id, competency_ids, draft_sentence, final_sentence) VALUES (?, ?, ?, ?)",
      )
      .run(found.id, JSON.stringify(uniqueIds), draftSentence, finalSentence);

    res.status(201).json({
      success: true,
      message: "변환 결과가 저장되었습니다.",
      data: {
        conversionId: toId("conv", result.lastInsertRowid),
        experienceId: toId("exp", found.id),
        competencyIds: uniqueIds,
        draftSentence: draftSentence,
        finalSentence: finalSentence,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

// 변환 결과 문장 수정: PATCH /api/conversions/conv_1
router.patch("/:conversionId", (req, res) => {
  const body = req.body || {};
  const finalSentence =
    typeof body.finalSentence === "string" ? body.finalSentence.trim() : "";

  try {
    const id = parseId("conv", req.params.conversionId);
    let conversion = null;
    if (id !== null) {
      conversion = db
        .prepare(
          `
        SELECT conversions.* FROM conversions
        JOIN experiences ON experiences.id = conversions.experience_id
        WHERE conversions.id = ? AND experiences.user_id = ?
      `,
        )
        .get(id, req.user.id);
    }
    if (!conversion) {
      return res.status(404).json({
        success: false,
        code: "CONVERSION_NOT_FOUND",
        message: "변환 결과를 찾을 수 없습니다.",
      });
    }

    if (!isFilled(finalSentence) || finalSentence.length > 1000) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SENTENCE",
        message: "최종 문장을 1000자 이하로 입력해 주세요.",
      });
    }

    db.prepare(
      `
      UPDATE conversions
      SET final_sentence = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ? AND experience_id IN (
        SELECT id FROM experiences WHERE user_id = ?
      )
    `,
    ).run(finalSentence.trim(), id, req.user.id);

    res.json({
      success: true,
      message: "변환 문장이 저장되었습니다.",
      data: {
        conversionId: toId("conv", id),
        finalSentence: finalSentence.trim(),
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
