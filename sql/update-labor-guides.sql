-- 근로 안내의 출처와 확인 날짜를 갱신한다
UPDATE labor_guides SET
  official_source_url = 'https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027161549',
  last_checked_at = '2026-11-26'
WHERE id = 'guide_001';

UPDATE labor_guides SET
  official_source_url = 'https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029728419',
  last_checked_at = '2026-11-26'
WHERE id = 'guide_002';

UPDATE labor_guides SET
  title = '임금·최저임금 확인',
  description = '정해진 임금 지급일과 실제 지급액을 확인하고, 시급은 해당 연도 최저임금 기준과 비교해 보세요. 이 안내만으로 위반 여부를 판단할 수는 없습니다.',
  official_source_url = 'https://minimumwage.go.kr/minWage/policy/decisionMain.do',
  last_checked_at = '2026-11-26'
WHERE id = 'guide_003';

UPDATE labor_guides SET
  description = '법정 근로시간은 휴게시간을 빼고 1일 8시간, 1주 40시간입니다. 주휴일은 출근일 등 요건을 확인해야 하며, 4주 평균 1주 소정근로시간이 15시간 미만이면 주휴일과 연차유급휴가가 적용되지 않습니다. 근무 형태와 사업장에 따라 적용 규정이 달라질 수 있어 이 안내만으로 위반 여부를 판단할 수 없습니다. (근로기준법 제18조, 제50조, 제55조)',
  check_items = '["근로계약서에 적힌 근무시간과 실제 근무시간이 같은지", "4주 평균 1주 소정근로시간을 확인했는지", "연장 근무를 했다면 기록이 남아 있는지"]',
  official_source_url = 'https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&efYd=20261008&lsiSeq=285279',
  last_checked_at = '2026-11-26'
WHERE id = 'guide_004';

UPDATE labor_guides SET
  description = '현재 기준으로 근로시간이 4시간이면 30분 이상, 8시간이면 1시간 이상의 휴게시간을 근무 도중에 받아야 합니다. 휴게시간은 자유롭게 이용할 수 있어야 합니다. 관련 법령 개정에 따라 적용 기준이 바뀔 수 있습니다. (근로기준법 제54조)',
  check_items = '["근로시간이 4시간이면 30분 이상, 8시간이면 1시간 이상 쉬었는지", "휴게시간을 근무 도중에 받았는지", "휴게시간에 자유롭게 쉴 수 있었는지"]',
  official_source_url = 'https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027453123',
  last_checked_at = '2026-11-26'
WHERE id = 'guide_005';
