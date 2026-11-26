# ABCLog Backend

ABCLog 백엔드는 Node.js, Express, SQLite로 구성되어 있습니다. 사용자가 아르바이트 경험을 저장하고, Gemini로 역량 문장 초안을 만들고, 관련 직무와 근로조건 정보를 확인할 수 있도록 API를 제공합니다.

역량 변환은 Gemini를 우선 사용하며, API 키가 없거나 Gemini 호출에 실패하면 기존 키워드 규칙으로 처리합니다.

## 기술 스택

- Node.js 22.9 이상
- Express.js
- SQLite (`better-sqlite3`)
- Google Gemini API (`gemini-3.6-flash` 기본 모델)
- 규칙 기반 역량 변환 대체 처리
- Swagger UI (`swagger-ui-express`)

## 시작하기

### 처음 실행하는 경우

```bash
npm install
npm run db:init
npm start
```

`npm run db:init`은 테이블과 기준 데이터를 처음 만들 때 사용합니다. **다시 실행하면 기존 계정, 경험, 변환 결과를 포함한 DB 데이터가 모두 삭제됩니다.**

### Gemini API 설정

프로젝트 폴더에서 `.env.example`을 `.env`로 복사한 뒤 [Google AI Studio에서 발급한 API 키](https://aistudio.google.com/app/apikey)를 `GEMINI_API_KEY`에 입력합니다.

```powershell
Copy-Item .env.example .env
```

`GEMINI_MODEL`은 선택 항목이며 기본값은 `gemini-3.6-flash`입니다. `.env`는 Git에 올리지 마세요. 키가 설정되지 않으면 규칙 기반 변환이 사용됩니다.

변환 요청 시 업종, 직무명, 업무 설명만 Gemini에 전달됩니다. 이메일, 이름, 계정 정보는 전달하지 않습니다. 업무 설명에 민감한 개인정보를 포함하지 않도록 주의해 주세요.

### 기존 DB를 사용하는 경우

`db.js`가 서버 시작 시 사용자 연결 필드와 access/refresh token 테이블을 추가하고, 기존 평문 비밀번호를 scrypt 해시로 바꿉니다. 업그레이드 전에 발급한 로그인 토큰에는 refresh token이 연결되어 있지 않으므로, 업그레이드 후 다시 로그인해 새 토큰 쌍을 발급받아야 합니다. 이전 경험 데이터는 소유자를 확인할 수 없어 계정에 자동 연결하지 않으며, 해당 데이터는 사용자 목록에 나타나지 않습니다.

근로조건 안내의 출처와 확인 날짜를 갱신할 때는 서버를 먼저 멈춘 뒤 실행합니다.

```bash
npm run db:update-guides
```

이 명령은 노동 안내 데이터만 갱신하며 계정이나 경험은 삭제하지 않습니다.

### 서버 실행

```bash
npm start       # 일반 실행
npm run dev     # 파일 변경 시 자동 재시작
```

## Swagger로 API 사용하기

서버가 실행 중일 때 [http://localhost:3000/api-docs](http://localhost:3000/api-docs)를 엽니다.

1. `POST /api/users/signup`에서 이메일, 이름, 8자 이상 비밀번호로 가입합니다.
2. `POST /api/users/login`을 실행합니다. 응답의 `data.accessToken`은 API 호출용이고, `data.refreshToken`은 갱신용입니다. 같은 계정으로 새로 로그인하면 이전 로그인 세션은 종료됩니다.
3. Swagger 상단 **Authorize**에 access token을 입력합니다. `Bearer ` 접두어는 입력하지 않습니다.
4. access token은 15분, refresh token은 30일 유효합니다. access token이 만료되면 `POST /api/users/refresh`에 현재 refresh token을 보내고, 응답으로 받은 두 토큰을 모두 교체해 저장합니다.
5. 이전 refresh token은 재사용할 수 없습니다. 재사용이 감지되면 해당 로그인 세션의 토큰이 폐기됩니다. 여러 요청이 동시에 갱신하지 않도록 프론트엔드에서 갱신 요청을 하나로 처리해야 합니다.
6. 보호된 경험·변환 API를 실행합니다.

`POST /api/users/logout`을 호출하면 현재 로그인 세션의 access token과 refresh token이 폐기됩니다.

### 변환 결과 저장 및 수정

`POST /api/experiences/:experienceId/conversions`는 초안만 생성하고 저장하지 않습니다. 결과를 보존하려면 `POST /api/conversions`에 `experienceId`, 생성 응답의 `competencies`, `draftSentence`를 전달합니다. `finalSentence`는 선택 항목이며 생략하면 초안으로 저장됩니다. 저장 후에는 경험별 조회 API로 확인하고, 저장된 문장을 수정할 때는 `PATCH /api/conversions/:conversionId`에 새 `finalSentence`를 보냅니다.

```json
{
  "experienceId": "exp_1",
  "competencies": [{ "competencyId": "comp_001" }],
  "draftSentence": "고객 요청을 파악해 정확하게 응대했습니다."
}
```

## API 목록

모든 API 주소 앞에는 `/api`가 붙습니다. 경험과 변환 API는 Bearer 토큰이 필요합니다. 역량·직무·근로조건 안내 조회 API는 공개되어 있습니다.

| Method | 주소 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/users/signup` | 회원가입 | 불필요 |
| POST | `/users/login` | 로그인 및 토큰 발급 | 불필요 |
| POST | `/users/refresh` | 토큰 갱신 및 refresh token 교체 | 불필요 (refreshToken 필요) |
| POST | `/users/logout` | 로그아웃 및 토큰 폐기 | 필요 |
| GET | `/experiences?page=1&limit=10` | 내 경험 목록 조회 | 필요 |
| POST | `/experiences` | 경험 등록 | 필요 |
| GET | `/experiences/:experienceId` | 경험 상세 조회 | 필요 |
| PATCH | `/experiences/:experienceId` | 경험 수정 | 필요 |
| DELETE | `/experiences/:experienceId` | 경험 삭제 | 필요 |
| POST | `/experiences/:experienceId/conversions` | 경험 기반 역량 변환 (저장하지 않음) | 필요 |
| GET | `/experiences/:experienceId/conversions` | 저장된 변환 결과 조회 | 필요 |
| POST | `/conversions` | 변환 결과 저장 | 필요 |
| PATCH | `/conversions/:conversionId` | 최종 문장 수정 | 필요 |
| GET | `/competencies` | 역량 목록 조회 | 불필요 |
| GET | `/jobs/catalog` | 직무 기준 데이터 조회 | 불필요 |
| GET | `/jobs/recommendations?competencyIds=comp_001,comp_002` | 역량 기반 직무 추천 | 불필요 |
| GET | `/labor-guides?topic=wage` | 근로조건 안내 조회 | 불필요 |

경험을 삭제하면 그 경험에 저장된 변환 결과도 함께 삭제됩니다. 다른 사용자의 경험이나 변환 결과는 조회·수정할 수 없습니다.
같은 계정에서 업종, 업무, 설명, 근무 기간이 모두 같은 경험을 다시 등록하면 새 항목을 만들지 않고 기존 항목을 반환합니다.

## 응답 형식

성공 응답 예시:

```json
{
  "success": true,
  "message": "경험이 등록되었습니다.",
  "data": {}
}
```

오류 응답 예시:

```json
{
  "success": false,
  "code": "EXPERIENCE_NOT_FOUND",
  "message": "해당 경험을 찾을 수 없습니다."
}
```

## 폴더 구조

```text
app.js                       서버 시작 및 라우터 연결
auth.js                      Bearer 토큰 확인
db.js                        SQLite 연결 및 기존 DB 업데이트
helpers.js                   ID 변환과 입력 검사 등 공통 함수
init-db.js                   테이블과 기준 데이터 초기화
update-labor-guides.js       노동 안내 출처 갱신
openapi.json                 Swagger API 명세
routes/                      기능별 API
sql/schema.sql               테이블 구조
sql/seed.sql                 역량·직무·노동 안내 기준 데이터
sql/update-labor-guides.sql  노동 안내 출처와 확인 날짜 갱신
```

## 확인이 필요한 항목

- 휴게시간 안내는 2026년 12월 10일 시행 예정 법령 개정 후 다시 확인해야 합니다.
- 전체 API 흐름과 프론트엔드 연동은 별도 테스트가 필요합니다.
