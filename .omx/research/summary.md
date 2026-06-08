# P1 Recommendation

`public/data/`를 브라우저가 다시 `fetch`하는 구조를 제거하고, 서버 전용 파일 로더가 빌드 시 데이터를 읽도록 한다.
검색과 필터가 필요한 두 화면만 클라이언트 아일랜드로 유지한다. 목록과 조직 화면은 서버 컴포넌트로 전환한다.
유한한 도메인 및 조직 ID는 `generateStaticParams`로 사전 생성한다.

## P2/P3 결과

- 내부 식별자는 `urn:rsf:skill:*`로 정직하게 분리한다.
- 확인되지 않은 ESCO URI는 `null`로 둔다.
- 관계는 `co_required`, `cross_domain`, `specialization` 유형으로 생성한다.
- `npm run validate:data`는 strict 의미 검증을 기본으로 실행한다.
- CI는 타입, 온톨로지 음성 테스트, 데이터 검증, 데이터 스모크 테스트, 빌드를 순서대로 실행한다.
