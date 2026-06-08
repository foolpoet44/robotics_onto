# 기술 전문가 육성 트랙 운영 가이드

## 목적

현재 육성 트랙은 구조 검증을 위한 MVP다. 후보자 데이터는 익명 샘플이며, 실제 임직원
정보를 정적 JSON에 저장하지 않는다.

## 운영 원칙

육성 트랙은 교육 수료 목록이 아니다. 각 단계에서 실제 증빙을 남기고, 다음 단계 이동은
육성위원회 또는 지정 리뷰어가 확인한다.

- 통합 부트캠프: 통합 PoC 시연과 핵심 스킬 진단
- 페어 임베드: 동료와 Production 솔루션 1건 완수
- 솔로 임베드: 단독 현장 과제 해결과 `1人1案` 승인
- Lv3 인증: 육성위원회 인증과 확산 계획 발표

## 반복 갱신 자동화

후보자 JSON을 직접 편집하지 않고 명령으로 단계, 직능 역량, 현장 과제 상태를 변경한다.
명령은 저장 전에 참조 무결성을 검증한다.

```bash
npm run update:development-candidate -- \
  --candidate-id CAND-001 \
  --stage pair_embed \
  --status completed \
  --reviewer "육성위원회"

npm run update:development-candidate -- \
  --candidate-id CAND-001 \
  --axis field-validation \
  --score 4

npm run update:development-candidate -- \
  --candidate-id CAND-001 \
  --impact-status delivered
```

## 실제 운영 전환 체크리스트

실제 임직원 정보를 연결하기 전에 아래 항목을 확정한다.

1. 로그인과 역할별 접근 권한
2. 사번, 조직, 평가 이력의 저장 위치와 보존 기간
3. 단계 이동 승인자와 감사 로그
4. HRIS 또는 사내 DB 연동 방식
5. 브라우저 `localStorage`에 저장 중인 스킬 중요도 평가의 팀 공용 저장소 이전

`localStorage`는 개인 브라우저 안에서만 유지된다. 현재 전문가 중요도 평가는 화면 구조를
검증하기 위한 실험 기능이며, 공식 평가 기록으로 취급하지 않는다.
