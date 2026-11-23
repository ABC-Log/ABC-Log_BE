const express = require('express');
const cors = require('cors');

const experiencesRouter = require('./routes/experiences');
const conversionsRouter = require('./routes/conversions');
const competenciesRouter = require('./routes/competencies');
const jobsRouter = require('./routes/jobs');

const app = express();

app.use(cors()); // 프론트엔드(다른 주소)에서 이 서버로 요청할 수 있게 허용
app.use(express.json()); // 요청 body의 JSON을 req.body 객체로 바꿔 준다

app.use('/api/experiences', experiencesRouter);
app.use('/api/conversions', conversionsRouter);
app.use('/api/competencies', competenciesRouter);
app.use('/api/jobs', jobsRouter);

// 없는 주소로 요청했을 때
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: '요청한 주소를 찾을 수 없습니다.',
  });
});

// 처리 중 오류가 났을 때 (예: body의 JSON 형식이 잘못된 경우)
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: '요청 JSON 형식이 올바르지 않습니다.',
    });
  }

  console.error(error);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('서버 실행 중: http://localhost:' + PORT);
});
