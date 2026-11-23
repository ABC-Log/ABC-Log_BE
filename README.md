# ABCLog Backend

Node.js + Express + SQLite로 만든 ABCLog 백엔드 서버입니다.
SQLite는 DB 전체가 파일 하나(`abclog.db`)에 저장되어서, MySQL처럼 따로 설치하거나 비밀번호를 설정할 필요가 없습니다.

## 실행 방법

1. 패키지 설치 (Node.js 22 이상 필요)
   ```bash
   npm install
   ```
2. DB 만들기 (테이블 + 기준 데이터). `abclog.db` 파일이 생깁니다. **다시 실행하면 기존 데이터가 모두 지워집니다.**
   ```bash
   npm run db:init
   ```
3. 서버 실행
   ```bash
   npm start        # 일반 실행
   npm run dev      # 코드를 고치면 자동으로 다시 실행
   ```
4. 브라우저에서 `http://localhost:3000/api/competencies` 를 열어 JSON이 보이면 성공입니다.

## 폴더 구조

```
app.js          서버 시작점 (라우터 연결)
db.js           SQLite 연결 (abclog.db 파일)
helpers.js      여러 라우터에서 같이 쓰는 함수 (ID 변환, 날짜 검사 등)
init-db.js      sql 폴더의 파일을 실행해서 DB를 만든다
sql/schema.sql  테이블 만들기
sql/seed.sql    역량, 변환 규칙, 직무, 근로조건 안내 데이터
routes/         기능별 API
```

## API 목록

모든 주소 앞에 `/api`가 붙습니다.

| Method | 주소 | 설명 |
| --- | --- | --- |
| POST | /users/signup | 회원가입 |
| POST | /users/login | 로그인 |
| GET | /experiences?page=1&limit=10 | 경험 목록 조회 |
| POST | /experiences | 경험 등록 |
| GET | /experiences/:experienceId | 경험 상세 조회 |
| PATCH | /experiences/:experienceId | 경험 수정 |
| DELETE | /experiences/:experienceId | 경험 삭제 (변환 결과도 같이 삭제) |
| POST | /experiences/:experienceId/conversions | 경험 → 역량 변환 (저장 안 함) |
| GET | /experiences/:experienceId/conversions | 저장된 변환 결과 목록 |
| POST | /conversions | 변환 결과 저장 |
| PATCH | /conversions/:conversionId | 최종 문장 수정 |
| GET | /competencies | 역량 목록 |
| GET | /jobs/catalog | 직무 기준 데이터 |
| GET | /jobs/recommendations?competencyIds=comp_001,comp_002 | 역량 기반 직무 추천 |
| GET | /labor-guides?topic=wage | 근로조건 점검 정보 |

## 응답 형식

```json
{ "success": true, "message": "경험이 등록되었습니다.", "data": { } }
```

```json
{ "success": false, "code": "EXPERIENCE_NOT_FOUND", "message": "해당 경험을 찾을 수 없습니다." }
```

## 아직 안 된 부분

- 로그인은 동작 확인용입니다. 비밀번호를 **암호화하지 않고** 저장하고, 토큰이나 세션이 없어서 경험 데이터가 사용자별로 나뉘지 않습니다.
- `sql/seed.sql`의 근로조건 안내는 서비스에 올리기 전에 공식 출처에서 다시 확인하고, 확인한 날짜로 `last_checked_at`을 고쳐야 합니다.
