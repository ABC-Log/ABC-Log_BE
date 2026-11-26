const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./openapi.json");

const usersRouter = require("./routes/users");
const experiencesRouter = require("./routes/experiences");
const conversionsRouter = require("./routes/conversions");
const competenciesRouter = require("./routes/competencies");
const jobsRouter = require("./routes/jobs");
const laborGuidesRouter = require("./routes/laborGuides");
const { requireAuth } = require("./auth");

const app = express();

app.use(cors()); // 다른 주소의 프론트엔드 요청을 허용한다
app.use(express.json()); // JSON 요청 본문을 읽는다

app.use("/api/users", usersRouter);
app.use("/api/experiences", requireAuth, experiencesRouter);
app.use("/api/conversions", requireAuth, conversionsRouter);
app.use("/api/competencies", competenciesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/labor-guides", laborGuidesRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));

// 등록되지 않은 주소를 처리한다
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "요청한 주소를 찾을 수 없습니다.",
  });
});

// 요청 처리 중 발생한 오류를 응답한다
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "요청 JSON 형식이 올바르지 않습니다.",
    });
  }

  console.error(error);
  res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("서버 실행 중: http://localhost:" + PORT);
});
