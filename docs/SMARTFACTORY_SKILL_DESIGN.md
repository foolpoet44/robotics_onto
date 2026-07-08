# 로봇테크 for 스마트팩토리 — 스킬 온톨로지 설계 문서

## 개요

ESCON 프로젝트에서 Physical AI 스킬 1,640개 중 로봇테크 도메인에 집중하여, 스마트팩토리 현장에 필요한 스킬 온톨로지를 재설계한다.

**설계 원칙:**

- ESCO(European Skills, Competences, and Occupations) 표준 기반
- knowledge → skill → competence 3층 계층 구조
- 3개 역할(Operator, Engineer, Developer) 기반 매핑
- proficiency_level 1~4 (기초/중급/고급/전문가) 고르게 분포
- 한영 병행 스킬명 및 설명

---

## 6개 도메인 스킬 맵

### Domain 1: 산업용 로봇 제어 (Industrial Robot Control)

**도메인 설명:**
산업용 로봇의 기본 운용, 티칭, 프로그래밍, 최적화에 필요한 스킬. ABB, FANUC, KUKA 등 주요 로봇 제조사의 시스템을 다룸.

**Knowledge Layer (알아야 할 것)**

- 로봇 구조 및 운동학 (Robot Kinematics & Dynamics)
- 로봇 제어 이론 (Control Theory)
- 산업용 로봇 안전 기준 (ISO 10218)
- 로봇 티칭 방법론
- 모션 플래닝 기초

**Skill Layer (할 수 있어야 할 것)**

- 로봇 매뉴얼 티칭 수행
- 로봇 프로그래밍 (로봇 고유 언어: RAPID, KRL 등)
- 로봇 좌표계 설정 및 보정
- 모션 제어 파라미터 조정
- 경로 최적화

**Competence Layer (현장 증명)**

- 생산 라인에서 로봇 운용 검증
- 주어진 사이클타임 내에 작업 완료
- 로봇 에러 코드 독해 및 기본 대응
- 작업 문서화

**목표 스킬 수:** 22개 (Knowledge 5, Skill 10, Competence 7)
**역할 분배:** Operator 7 / Engineer 10 / Developer 5
**Proficiency 분포:** Lv1 4 / Lv2 8 / Lv3 7 / Lv4 3

---

### Domain 2: 머신비전 & 센서 통합 (Machine Vision & Sensor Integration)

**도메인 설명:**
로봇 시스템에 장착되는 비전 센서, 거리 센서, 접촉 센서 등 센서 기반 자동화 스킬. 이미지 처리, 센서 캘리브레이션, 신호 처리 포함.

**Knowledge Layer**

- 디지털 이미지 처리 (Image Processing)
- 머신비전 카메라 종류 및 광학 이론
- 센서 종류 및 신호 처리 (Force, Distance, Vision)
- 컴퓨터 비전 기초 (CNN, Feature Detection)
- 센서 캘리브레이션 이론

**Skill Layer**

- 카메라 설정 및 조광 조정
- 이미지 기반 결함 검출 설정
- 센서 신호 수집 및 필터링
- 센서-로봇 동기화 프로그래밍
- 시뮬레이션 환경에서 비전 파이프라인 구성

**Competence Layer**

- 실제 제조 환경에서 비전 시스템 캘리브레이션
- 정해진 검출율(정확도 95% 이상) 달성
- 센서 고장 진단 및 대체 방안 수립
- 센서 데이터 로깅 및 분석

**목표 스킬 수:** 21개 (Knowledge 5, Skill 9, Competence 7)
**역할 분배:** Operator 5 / Engineer 12 / Developer 4
**Proficiency 분포:** Lv1 4 / Lv2 8 / Lv3 6 / Lv4 3

---

### Domain 3: 협동로봇 운용 (Collaborative Robot Operation)

**도메인 설명:**
인간과 로봇이 공유 작업 공간에서 안전하게 협업하는 협동로봇(cobot) 기술. Universal Robots, Rethink Robotics 등의 협동로봇 플랫폼 운용.

**Knowledge Layer**

- 협동로봇의 안전 개념 (ISO/TS 15066)
- 힘/토크 제한 및 모니터링 원리
- 사용자 친화적 프로그래밍 인터페이스 (Graphical Programming)
- 협동로봇의 산업 응용 사례
- 인적 요소 및 인간공학 (Ergonomics)

**Skill Layer**

- 협동로봇 안전 설정 (속도 제한, 힘 제한)
- 드래그-앤-드롭 티칭
- 협동로봇 전용 프로그래밍 (URScript 등)
- 인간-로봇 상호작용 시나리오 설계
- 협동 작업 태스크 분석 및 할당

**Competence Layer**

- 협동 워크셀 안전성 검증 (실제 환경)
- 사용자 교육 및 가이드 작성
- 협동 작업 사이클 타임 측정
- 작업 안전성 평가 보고서 작성

**목표 스킬 수:** 20개 (Knowledge 5, Skill 9, Competence 6)
**역할 분배:** Operator 9 / Engineer 8 / Developer 3
**Proficiency 분포:** Lv1 5 / Lv2 8 / Lv3 5 / Lv4 2

---

### Domain 4: 자율이동로봇 (AMR/AGV Systems)

**도메인 설명:**
자율이동로봇(AMR) 및 자동유도차량(AGV)의 운용, 경로 계획, 네비게이션, 함대 관리. 창고, 제조 현장의 물류 자동화에 필수.

**Knowledge Layer**

- SLAM (Simultaneous Localization and Mapping) 개념
- 경로 계획 알고리즘 (Dijkstra, A\*, RRT)
- 차량 동역학 및 제어
- 무선 네트워크 및 통신 프로토콜
- 함대 관리 시스템 (Fleet Management)

**Skill Layer**

- AMR 환경 맵 작성 (Mapping)
- 경로 계획 매개변수 조정
- AMR 충돌 회피 설정
- 멀티-로봇 교통 관제
- 함대 성능 모니터링

**Competence Layer**

- 실제 제조 환경에서 맵 생성 및 검증
- 정해진 경로 내에서 자율 주행 달성
- 함대 충돌 발생 시 원인 분석 및 개선
- AMR 운용 매뉴얼 작성

**목표 스킬 수:** 22개 (Knowledge 5, Skill 10, Competence 7)
**역할 분배:** Operator 8 / Engineer 10 / Developer 4
**Proficiency 분포:** Lv1 4 / Lv2 8 / Lv3 7 / Lv4 3

---

### Domain 5: 로봇 유지보수 & 진단 (Robot Maintenance & Diagnostics)

**도메인 설명:**
로봇 시스템의 예방적 유지보수, 고장 진단, 부품 교체, 성능 최적화. 가동률(Availability)와 신뢰성(Reliability) 확보가 목표.

**Knowledge Layer**

- 로봇 부품 분류 및 수명 관리 (BOM)
- 신뢰성 공학 (MTBF, MTTF)
- 예방적 유지보수 전략 (PM, PdM)
- 로봇 진단 도구 및 로깅 시스템
- 윤활유 및 냉각액 관리

**Skill Layer**

- 로봇 상태 모니터링 및 트렌드 분석
- 고장 코드 해석 및 원인 파악
- 베어링, 기어, 모터 검사 및 교체
- 소프트웨어 업그레이드 수행
- 성능 벤치마크 테스트 실시

**Competence Layer**

- 예방적 유지보수 일정 수립 및 실행
- 긴급 고장 대응 (예: 생산 중단 시 신속 복구)
- 부품 수명 예측 및 재고 관리
- 유지보수 보고서 및 성능 지표 기록

**목표 스킬 수:** 20개 (Knowledge 5, Skill 9, Competence 6)
**역할 분배:** Operator 6 / Engineer 10 / Developer 4
**Proficiency 분포:** Lv1 3 / Lv2 8 / Lv3 6 / Lv4 3

---

### Domain 6: 디지털트윈 & 시뮬레이션 (Digital Twin & Simulation)

**도메인 설명:**
물리적 로봇 시스템의 디지털 복제본(Digital Twin)을 구축하고, 생산 라인을 가상 환경에서 검증. 이를 통해 설계 리스크 감소, 조업 최적화 실현.

**Knowledge Layer**

- 디지털트윈 아키텍처 및 데이터 동기화
- 물리 시뮬레이션 엔진 (Gazebo, CoppeliaSim, Isaac Sim)
- 3D 모델링 및 메시 생성
- 로봇 시뮬레이션 소프트웨어 (ROS, MoveIt)
- 실시간 데이터 파이프라인

**Skill Layer**

- 3D CAD 모델을 시뮬레이션 환경으로 임포트
- 로봇 시뮬레이션 환경 구성
- 생산 라인 레이아웃 검증 (Collision Detection, Cycle Time)
- 실제 로봇과 디지털트윈 동기화
- 성능 데이터 수집 및 분석

**Competence Layer**

- 신규 제조 라인 설계 시 시뮬레이션 검증 완료
- 실제 라인 배치 전 리스크 제거
- 운영 시나리오(고장, 병목) 시뮬레이션 실행
- 최적화된 사이클 타임 달성

**목표 스킬 수:** 21개 (Knowledge 5, Skill 9, Competence 7)
**역할 분배:** Operator 3 / Engineer 9 / Developer 9
**Proficiency 분포:** Lv1 3 / Lv2 7 / Lv3 7 / Lv4 4

---

### Domain 7: Agentic AI 제조 (Agentic AI Manufacturing)

**도메인 설명:**
AI 에이전트가 MES·품질·생산계획 업무를 자율 수행하도록 설계·운영하는 역량.
자동 판단에 휴먼-인-더-루프 승인과 가드레일을 배치해 안전한 자율화를 실현.
4대 도메인(칼리지) 체계의 Agentic AI Manufacturing 커버리지 갭을 해소하기 위해
증설된 도메인이다(`docs/DOMAIN_RECLASSIFICATION_PLAN.md` 6절 참고).

**Knowledge Layer**

- AI 에이전트 기초 개념 (계획-실행-관찰 루프, 도구 호출)
- LLM 및 프롬프트 엔지니어링 기초
- MES 및 제조 실행 프로세스
- 통계적 공정 관리(SPC)
- 생산계획 및 스케줄링 이론 (APS)

**Skill Layer**

- 공정 에이전트 설계 및 도구 연동 (MES·설비·데이터 API)
- 프롬프트 설계·평가와 멀티 에이전트 오케스트레이션
- MES 워크플로 자동화, 작업지시 자동 생성
- 품질 이상 자동 판정
- 휴먼-인-더-루프 승인 흐름 설계, 에이전트 가드레일 구성

**Competence Layer**

- 자율 운영 예외 대응, 품질 이상 자동 격리 운영
- 생산계획 자동 수립 운영
- 에이전트 성과 평가·안전성 검증·감사 추적 운영
- 자율화 확산 계획

**목표 스킬 수:** 21개 (Knowledge 5, Skill 9, Competence 7)
**역할 분배:** Operator 3 / Engineer 21 / Developer 14
**Proficiency 분포:** Lv1 2 / Lv2 8 / Lv3 8 / Lv4 3

---

## 통합 통계

| 도메인           | Knowledge | Skill  | Competence | 합계    | Op     | Eng    | Dev    |
| ---------------- | --------- | ------ | ---------- | ------- | ------ | ------ | ------ |
| 산업용 로봇 제어 | 5         | 10     | 7          | 22      | 7      | 10     | 5      |
| 머신비전 & 센서  | 5         | 9      | 7          | 21      | 5      | 12     | 4      |
| 협동로봇 운용    | 5         | 9      | 6          | 20      | 9      | 8      | 3      |
| 자율이동로봇     | 5         | 10     | 7          | 22      | 8      | 10     | 4      |
| 로봇 유지보수    | 5         | 9      | 6          | 20      | 6      | 10     | 4      |
| 디지털트윈       | 5         | 9      | 7          | 21      | 3      | 9      | 9      |
| Agentic AI 제조  | 5         | 9      | 7          | 21      | 3      | 21     | 14     |
| **총계**         | **35**    | **65** | **47**     | **147** | **41** | **80** | **43** |

위 표는 초기 목표 설계이며, 이후 자사 AI Factory 아키텍처 정렬로 확장
스킬 11개가 증설되었습니다(도메인 시퀀스 말미에 추가, 기존 ID 보존):
PLC·설비 제어 연동(IRC), IoT 센서·엣지 통합(MVS), 휴머노이드 로봇 운용
기초(CRO), 에뮬레이션·가상 커미셔닝(DTS), 그리고 Agentic AI 제조 7개
(설비/개발 Agent, 자재·협력사, 물류·SCM, 지식그래프, Data Fabric,
제조 특화 LLM — 뒤 3개는 Data Intelligence로 재분류 제안). 현재 총
159개 스킬입니다.

---

## 역할 정의

### 1. Robot Operator (로봇 조작자)

- **담당 활동**: 로봇 및 시스템 운용, 기본적인 문제해결
- **필요 Proficiency**: Lv1-2 (기초~중급)
- **스킬 분포**: 38개 (약 30%)
- **특징**: Knowledge 20%, Skill 50%, Competence 30%

### 2. Robot Engineer (로봇 엔지니어)

- **담당 활동**: 시스템 통합, 프로그래밍, 최적화, 유지보수
- **필요 Proficiency**: Lv2-3 (중급~고급)
- **스킬 분포**: 59개 (약 47%)
- **특징**: Knowledge 25%, Skill 50%, Competence 25%

### 3. Robot Developer (로봇 개발자)

- **담당 활동**: 알고리즘 개발, 신기술 적용, 아키텍처 설계
- **필요 Proficiency**: Lv3-4 (고급~전문가)
- **스킬 분포**: 29개 (약 23%)
- **특징**: Knowledge 40%, Skill 35%, Competence 25%

---

## 다음 단계

1. 기존 ESCON 스킬 데이터 중 6개 도메인에 매핑 가능한 항목 추출
2. 부족한 스킬은 위 설계에 따라 신규 작성
3. 각 스킬에 한국어 및 영문 레이블, ESCO URI, proficiency_level, role_mapping 할당
4. `public/data/robot-smartfactory.json` 생성
5. 검증 스크립트(`scripts/validate-robot-data.js`) 실행
