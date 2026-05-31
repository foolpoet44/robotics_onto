# Factory Robotics Skill Map

스마트팩토리 로보틱스 현장 역량에 집중한 독립 프로젝트입니다.

## 포함 범위

- 산업용 로봇 제어
- 머신비전 및 센서 통합
- 협동로봇 운용
- 자율이동로봇
- 로봇 유지보수 및 진단
- 디지털트윈 및 시뮬레이션

## 실행

```bash
npm install
npm run validate:data
npm run build
npm run dev
```

## 데이터 갱신

```bash
npm run generate:data
npm run generate:raw
npm run validate:data
```

`public/data/robot-smartfactory.json`이 화면에서 사용하는 기준 데이터입니다.
개별 스킬 JSON은 `npm run generate:raw`로 다시 생성합니다.
