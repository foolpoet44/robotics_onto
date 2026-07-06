#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
로봇테크 for 스마트팩토리 스킬 데이터 생성 스크립트

기존 ESCON skills.json에서 로봇/제조 관련 스킬을 추출하고,
미션의 설계 원칙에 따라 6개 도메인의 스킬 온톨로지를 구성한다.

설계 원칙:
- ESCO 기반 3층 계층 구조 (Knowledge → Skill → Competence)
- 3개 역할 매핑 (Operator, Engineer, Developer)
- proficiency_level 1~4 분포
- 한영 병행 스킬명 및 설명
"""

import json
import uuid
import sys
from pathlib import Path
from typing import List, Dict, Any

# ==================== 데이터 구조 ====================

# 6개 도메인 정의
DOMAINS = {
    "industrial-robot-control": {
        "name_ko": "산업용 로봇 제어",
        "name_en": "Industrial Robot Control",
        "code": "IRC",
        "target_count": 22,
    },
    "machine-vision-sensor": {
        "name_ko": "머신비전 & 센서 통합",
        "name_en": "Machine Vision & Sensor Integration",
        "code": "MVS",
        "target_count": 21,
    },
    "collaborative-robot": {
        "name_ko": "협동로봇 운용",
        "name_en": "Collaborative Robot Operation",
        "code": "CRO",
        "target_count": 20,
    },
    "autonomous-mobile-robot": {
        "name_ko": "자율이동로봇",
        "name_en": "AMR/AGV Systems",
        "code": "AMR",
        "target_count": 22,
    },
    "robot-maintenance-diagnostics": {
        "name_ko": "로봇 유지보수 & 진단",
        "name_en": "Robot Maintenance & Diagnostics",
        "code": "RMD",
        "target_count": 20,
    },
    "digital-twin-simulation": {
        "name_ko": "디지털트윈 & 시뮬레이션",
        "name_en": "Digital Twin & Simulation",
        "code": "DTS",
        "target_count": 21,
    },
    "agentic-ai-manufacturing": {
        "name_ko": "Agentic AI 제조",
        "name_en": "Agentic AI Manufacturing",
        "code": "AAM",
        "target_count": 21,
    },
}

# 3개 역할
ROLES = ["operator", "engineer", "developer"]

# ==================== 스킬 정의 (Knowledge) ====================

KNOWLEDGE_SKILLS = {
    "industrial-robot-control": [
        {
            "label_ko": "로봇 구조 및 운동학",
            "label_en": "Robot Kinematics and Dynamics",
            "description_ko": "로봇의 물리적 구조, 조인트 운동, 역운동학을 이해하는 기초 지식",
            "description_en": "Fundamental knowledge of robot physical structure, joint motion, and inverse kinematics",
            "proficiency": 1,
        },
        {
            "label_ko": "로봇 제어 이론",
            "label_en": "Robot Control Theory",
            "description_ko": "PID 제어, 궤적 계획, 모션 제어의 이론적 기초",
            "description_en": "Theoretical foundation of PID control, trajectory planning, and motion control",
            "proficiency": 2,
        },
        {
            "label_ko": "산업용 로봇 안전 기준",
            "label_en": "Industrial Robot Safety Standards (ISO 10218)",
            "description_ko": "ISO 10218, ANSI/NFPA 79 등 산업용 로봇 안전 표준 및 규제",
            "description_en": "Safety standards and regulations for industrial robots including ISO 10218 and ANSI/NFPA 79",
            "proficiency": 1,
        },
        {
            "label_ko": "로봇 티칭 방법론",
            "label_en": "Robot Teaching Methodologies",
            "description_ko": "온라인 티칭, 오프라인 프로그래밍, 매뉴얼 가이딩 등 다양한 티칭 방식",
            "description_en": "Various teaching approaches including online teaching, offline programming, and manual guiding",
            "proficiency": 1,
        },
        {
            "label_ko": "모션 플래닝 기초",
            "label_en": "Motion Planning Fundamentals",
            "description_ko": "경로 계획, 충돌 회피, 움직임 최적화의 기초 개념",
            "description_en": "Fundamental concepts of path planning, collision avoidance, and motion optimization",
            "proficiency": 2,
        },
    ],
    "machine-vision-sensor": [
        {
            "label_ko": "디지털 이미지 처리",
            "label_en": "Digital Image Processing",
            "description_ko": "필터링, 엣지 검출, 화소 조작 등 이미지 처리 기초",
            "description_en": "Fundamentals of image processing including filtering, edge detection, and pixel manipulation",
            "proficiency": 2,
        },
        {
            "label_ko": "머신비전 카메라 및 광학",
            "label_en": "Machine Vision Cameras and Optics",
            "description_ko": "카메라 센서 종류, 렌즈 특성, 조광 원리",
            "description_en": "Camera sensor types, lens characteristics, and lighting principles",
            "proficiency": 1,
        },
        {
            "label_ko": "센서 신호 처리",
            "label_en": "Sensor Signal Processing",
            "description_ko": "아날로그-디지털 변환, 필터링, 노이즈 제거 기초",
            "description_en": "Analog-to-digital conversion, filtering, and noise reduction fundamentals",
            "proficiency": 2,
        },
        {
            "label_ko": "컴퓨터 비전 알고리즘",
            "label_en": "Computer Vision Algorithms",
            "description_ko": "CNN, 특징 추출, 물체 인식 기초",
            "description_en": "Fundamentals of CNNs, feature extraction, and object recognition",
            "proficiency": 3,
        },
        {
            "label_ko": "센서 캘리브레이션 이론",
            "label_en": "Sensor Calibration Theory",
            "description_ko": "카메라 캘리브레이션, 좌표 변환, 정확도 평가",
            "description_en": "Camera calibration, coordinate transformation, and accuracy assessment",
            "proficiency": 2,
        },
    ],
    "collaborative-robot": [
        {
            "label_ko": "협동로봇 안전 개념",
            "label_en": "Collaborative Robot Safety Concepts",
            "description_ko": "ISO/TS 15066, 힘 제한, 속도 제한의 안전 원칙",
            "description_en": "Safety principles including ISO/TS 15066, force limiting, and speed limiting",
            "proficiency": 1,
        },
        {
            "label_ko": "힘/토크 모니터링 원리",
            "label_en": "Force/Torque Monitoring Principles",
            "description_ko": "육축 센서, 임피던스 제어, 힘 피드백 제어",
            "description_en": "Six-axis sensors, impedance control, and force feedback control",
            "proficiency": 2,
        },
        {
            "label_ko": "사용자 친화적 프로그래밍",
            "label_en": "User-Friendly Programming Interfaces",
            "description_ko": "드래그-앤-드롭, 그래픽 프로그래밍, 음성 인터페이스",
            "description_en": "Drag-and-drop, graphical programming, and voice interfaces",
            "proficiency": 1,
        },
        {
            "label_ko": "협동로봇 산업 응용",
            "label_en": "Collaborative Robot Industrial Applications",
            "description_ko": "조립, 검사, 포장 등 협동 로봇의 주요 응용 사례",
            "description_en": "Key collaborative robot applications in assembly, inspection, and packaging",
            "proficiency": 2,
        },
        {
            "label_ko": "인간공학 및 인적 요소",
            "label_en": "Ergonomics and Human Factors",
            "description_ko": "작업 설계, 사용자 편의성, 피로도 관리",
            "description_en": "Job design, user convenience, and fatigue management",
            "proficiency": 2,
        },
    ],
    "autonomous-mobile-robot": [
        {
            "label_ko": "SLAM 개념",
            "label_en": "Simultaneous Localization and Mapping (SLAM)",
            "description_ko": "동시 위치 파악 및 맵 작성의 기초 이론",
            "description_en": "Fundamental theory of simultaneous localization and mapping",
            "proficiency": 3,
        },
        {
            "label_ko": "경로 계획 알고리즘",
            "label_en": "Path Planning Algorithms",
            "description_ko": "Dijkstra, A*, RRT 등 주요 경로 계획 알고리즘",
            "description_en": "Major path planning algorithms including Dijkstra, A*, and RRT",
            "proficiency": 3,
        },
        {
            "label_ko": "차량 동역학 및 제어",
            "label_en": "Vehicle Dynamics and Control",
            "description_ko": "휠 기구학, 속도 제어, 조향 제어",
            "description_en": "Wheel kinematics, velocity control, and steering control",
            "proficiency": 2,
        },
        {
            "label_ko": "무선 네트워크 및 통신",
            "label_en": "Wireless Networks and Communication Protocols",
            "description_ko": "WiFi, 5G, ROS 통신, 지연 및 안정성",
            "description_en": "WiFi, 5G, ROS communication, latency, and reliability",
            "proficiency": 2,
        },
        {
            "label_ko": "함대 관리 시스템",
            "label_en": "Fleet Management Systems",
            "description_ko": "멀티-로봇 조율, 중앙 제어, 교통 관제",
            "description_en": "Multi-robot coordination, centralized control, and traffic management",
            "proficiency": 3,
        },
    ],
    "robot-maintenance-diagnostics": [
        {
            "label_ko": "로봇 부품 분류 및 수명 관리",
            "label_en": "Robot Component Classification and Life Management",
            "description_ko": "BOM(자재명세서), MTBF, 부품 수명 예측",
            "description_en": "BOM, MTBF, and component lifespan prediction",
            "proficiency": 2,
        },
        {
            "label_ko": "신뢰성 공학",
            "label_en": "Reliability Engineering",
            "description_ko": "MTBF, MTTF, 가용성, 신뢰도 분석",
            "description_en": "MTBF, MTTF, availability, and reliability analysis",
            "proficiency": 2,
        },
        {
            "label_ko": "예방적 유지보수 전략",
            "label_en": "Preventive Maintenance Strategies",
            "description_ko": "예방적 유지보수(PM), 예측적 유지보수(PdM), 상태 기반 유지보수",
            "description_en": "Preventive maintenance (PM), predictive maintenance (PdM), and condition-based maintenance",
            "proficiency": 2,
        },
        {
            "label_ko": "로봇 진단 도구 및 로깅",
            "label_en": "Robot Diagnostics Tools and Logging Systems",
            "description_ko": "고장 코드, 센서 로깅, 성능 지표",
            "description_en": "Fault codes, sensor logging, and performance metrics",
            "proficiency": 2,
        },
        {
            "label_ko": "윤활유 및 냉각액 관리",
            "label_en": "Lubricant and Coolant Management",
            "description_ko": "윤활유 종류, 냉각 시스템, 품질 관리",
            "description_en": "Lubricant types, cooling systems, and quality management",
            "proficiency": 1,
        },
    ],
    "digital-twin-simulation": [
        {
            "label_ko": "디지털트윈 아키텍처",
            "label_en": "Digital Twin Architecture",
            "description_ko": "물리 시스템과 디지털 복제본의 동기화 아키텍처",
            "description_en": "Synchronization architecture between physical systems and digital replicas",
            "proficiency": 3,
        },
        {
            "label_ko": "물리 시뮬레이션 엔진",
            "label_en": "Physics Simulation Engines",
            "description_ko": "Gazebo, CoppeliaSim, Isaac Sim 등 시뮬레이션 플랫폼",
            "description_en": "Simulation platforms including Gazebo, CoppeliaSim, and Isaac Sim",
            "proficiency": 2,
        },
        {
            "label_ko": "3D 모델링 및 메시 생성",
            "label_en": "3D Modeling and Mesh Generation",
            "description_ko": "CAD, STL, URDF, 메시 최적화",
            "description_en": "CAD, STL, URDF, and mesh optimization",
            "proficiency": 2,
        },
        {
            "label_ko": "로봇 시뮬레이션 소프트웨어",
            "label_en": "Robot Simulation Software",
            "description_ko": "ROS, MoveIt, URSim 등 로봇 시뮬레이션 플랫폼",
            "description_en": "Robot simulation platforms including ROS, MoveIt, and URSim",
            "proficiency": 3,
        },
        {
            "label_ko": "실시간 데이터 파이프라인",
            "label_en": "Real-Time Data Pipelines",
            "description_ko": "센서 데이터 수집, 스트리밍, 클라우드 연결",
            "description_en": "Sensor data collection, streaming, and cloud integration",
            "proficiency": 3,
        },
    ],
    "agentic-ai-manufacturing": [
        {
            "label_ko": "AI 에이전트 기초 개념",
            "label_en": "Agentic AI Fundamentals",
            "description_ko": "목표 지향 에이전트, 계획-실행-관찰 루프, 도구 호출의 기본 개념",
            "description_en": "Core concepts of goal-driven agents, plan-act-observe loops, and tool calling",
            "proficiency": 1,
        },
        {
            "label_ko": "LLM 및 프롬프트 엔지니어링 기초",
            "label_en": "LLM and Prompt Engineering Basics",
            "description_ko": "대규모 언어 모델의 동작 특성, 프롬프트 설계 원칙, 한계와 실패 유형",
            "description_en": "Behavior of large language models, prompt design principles, limitations and failure modes",
            "proficiency": 2,
        },
        {
            "label_ko": "MES 및 제조 실행 프로세스",
            "label_en": "MES and Manufacturing Execution Processes",
            "description_ko": "작업지시, 실적 집계, 품질 이력 등 제조 실행 시스템의 핵심 프로세스",
            "description_en": "Core MES processes including work orders, production reporting, and quality history",
            "proficiency": 1,
        },
        {
            "label_ko": "통계적 공정 관리(SPC)",
            "label_en": "Statistical Process Control (SPC)",
            "description_ko": "관리도, 공정능력지수, 이상 패턴 판정 등 품질관리 통계 기법",
            "description_en": "Quality control statistics including control charts, process capability, and anomaly patterns",
            "proficiency": 2,
        },
        {
            "label_ko": "생산계획 및 스케줄링 이론",
            "label_en": "Production Planning and Scheduling Theory",
            "description_ko": "APS, 유한 능력 스케줄링, 제약 기반 계획 수립의 이론적 기초",
            "description_en": "Theoretical foundation of APS, finite-capacity scheduling, and constraint-based planning",
            "proficiency": 2,
        },
    ],
}

# ==================== 스킬 정의 (Skill & Competence) ====================

SKILL_COMPETENCE_TEMPLATES = {
    "industrial-robot-control": {
        "skill": [
            ("로봇 매뉴얼 티칭", "Robot Manual Teaching", "손으로 로봇 팔을 조작하여 작업 경로를 기록", "Record work paths by manually manipulating robot arm"),
            ("로봇 프로그래밍", "Robot Programming", "로봇 고유 언어(RAPID, KRL 등)로 프로그래밍", "Program using robot-specific languages (RAPID, KRL, etc.)"),
            ("좌표계 설정 및 보정", "Coordinate Frame Setup and Calibration", "로봇의 기준점을 설정하고 정확성 검증", "Set robot reference points and validate accuracy"),
            ("모션 제어 파라미터 조정", "Motion Control Parameter Adjustment", "속도, 가속도, 감속도 등 파라미터 최적화", "Optimize parameters such as speed and acceleration"),
            ("경로 최적화", "Path Optimization", "충돌 회피하면서 이동 거리 최소화", "Minimize travel distance while avoiding collisions"),
            ("로봇 안전 설정", "Robot Safety Configuration", "안전 펜스, 속도 제한 등 안전 기능 설정", "Configure safety features including fences and speed limits"),
            ("시뮬레이션 기반 프로그래밍", "Simulation-Based Programming", "시뮬레이션 환경에서 프로그램 테스트", "Test programs in simulation environment"),
            ("다축 동기 제어", "Multi-Axis Synchronized Control", "여러 로봇의 협력 동작 제어", "Control coordinated movements of multiple robots"),
            ("센서 입출력 처리", "Sensor Input/Output Processing", "센서 신호를 로봇 동작에 반영", "Integrate sensor signals into robot motion"),
            ("에러 로그 분석", "Error Log Analysis", "로봇 에러 코드 해석 및 해결 방법 찾기", "Interpret robot error codes and find solutions"),
        ],
        "competence": [
            ("생산 라인 로봇 운용", "Production Line Robot Operation", "실제 제조 환경에서 로봇 운용", "Operate robots in actual manufacturing environment"),
            ("사이클 타임 달성", "Cycle Time Achievement", "정해진 시간 내에 작업 완료", "Complete work within specified cycle time"),
            ("로봇 고장 대응", "Robot Fault Response", "로봇 오류 발생 시 신속한 진단 및 복구", "Quickly diagnose and recover from robot failures"),
            ("작업 문서화", "Work Documentation", "프로그램 및 설정 내용 상세히 기록", "Document programs and configurations in detail"),
            ("라인 밸런싱", "Line Balancing", "여러 로봇의 작업 시간을 균등하게 배분", "Balance work time across multiple robots"),
            ("협력업체 기술 지원", "Technical Support to Contractors", "외부 인력에게 로봇 운용 방법 교육", "Train external staff on robot operation"),
            ("생산성 향상 제안", "Productivity Improvement Proposal", "로봇 운용 효율성 개선 방안 제시", "Propose improvements to robot operation efficiency"),
        ],
    },
    "machine-vision-sensor": {
        "skill": [
            ("카메라 설정 및 조광", "Camera Setup and Illumination Adjustment", "카메라 해상도, 노출, 포커스 조정", "Adjust camera resolution, exposure, and focus"),
            ("이미지 기반 결함 검출", "Image-Based Defect Detection", "비전 소프트웨어를 이용한 결함 검출 설정", "Configure defect detection using vision software"),
            ("센서 신호 수집 및 필터링", "Sensor Signal Acquisition and Filtering", "여러 센서에서 신호 수집 및 노이즈 제거", "Collect sensor signals and remove noise"),
            ("센서-로봇 동기화", "Sensor-Robot Synchronization", "센서 신호를 로봇 동작과 동기화", "Synchronize sensor signals with robot motion"),
            ("시뮬레이션 비전 파이프라인", "Simulation Vision Pipeline", "시뮬레이션 환경에서 비전 시스템 구성", "Configure vision system in simulation"),
            ("카메라 캘리브레이션", "Camera Calibration", "카메라의 왜곡 보정 및 좌표 변환", "Correct camera distortion and coordinate transformation"),
            ("특징 추출 및 매칭", "Feature Extraction and Matching", "이미지에서 특징 찾기 및 매칭", "Extract and match features in images"),
            ("실시간 이미지 처리", "Real-Time Image Processing", "고속으로 이미지를 처리하고 결과 전달", "Process images in real-time and deliver results"),
            ("멀티 센서 융합", "Multi-Sensor Fusion", "여러 센서의 정보를 통합하여 의사결정", "Integrate information from multiple sensors for decision-making"),
        ],
        "competence": [
            ("제조 환경 비전 시스템 구축", "Manufacturing Vision System Implementation", "실제 제조 라인에 비전 시스템 설치 및 검증", "Install and verify vision system on actual production line"),
            ("검출율 목표 달성", "Defect Detection Rate Achievement", "정해진 검출율(95% 이상) 달성", "Achieve specified detection rate (95% or higher)"),
            ("센서 고장 진단", "Sensor Fault Diagnosis", "센서 고장을 정확히 식별하고 원인 파악", "Identify sensor faults and determine root causes"),
            ("대체 센서 제안", "Alternative Sensor Proposal", "고장난 센서 대신 다른 센서 제안 및 적용", "Propose and implement alternative sensors"),
            ("센서 데이터 로깅", "Sensor Data Logging", "센서 데이터를 자동으로 기록하고 분석", "Automatically log and analyze sensor data"),
            ("성능 보고서 작성", "Performance Report Generation", "비전 시스템 성능 지표 정리 및 보고", "Compile and report vision system performance metrics"),
            ("카메라 교체 작업", "Camera Replacement", "고장난 카메라를 신제품으로 교체", "Replace faulty cameras with new ones"),
        ],
    },
    "collaborative-robot": {
        "skill": [
            ("협동로봇 안전 설정", "Collaborative Robot Safety Configuration", "속도 제한, 힘 제한, 안전 영역 설정", "Configure speed limits, force limits, and safety zones"),
            ("드래그-앤-드롭 티칭", "Drag-and-Drop Teaching", "GUI를 통한 간편 티칭", "Teach using graphical user interface"),
            ("협동로봇 프로그래밍", "Collaborative Robot Programming", "URScript, Python 등으로 협동로봇 프로그래밍", "Program collaborative robots using URScript, Python, etc."),
            ("인간-로봇 상호작용 설계", "Human-Robot Interaction Design", "안전한 협동 작업 시나리오 설계", "Design safe collaborative work scenarios"),
            ("협동 작업 태스크 분석", "Collaborative Task Analysis", "인간과 로봇의 작업 분담 계획", "Plan task allocation between human and robot"),
            ("터치 감지 및 안전 반응", "Touch Sensing and Safety Response", "접촉 감지 시 로봇의 안전한 반응 설정", "Configure safe robot reactions to touch detection"),
            ("협동 작업 시뮬레이션", "Collaborative Work Simulation", "시뮬레이션에서 인간-로봇 협력 검증", "Verify human-robot collaboration in simulation"),
            ("사용자 안전 교육", "User Safety Training", "협동로봇 사용자에게 안전 교육", "Provide safety training to collaborative robot users"),
            ("힘 제어 파라미터 튜닝", "Force Control Parameter Tuning", "힘 제어의 감도 및 응답성 조정", "Adjust force control sensitivity and responsiveness"),
        ],
        "competence": [
            ("협동 워크셀 안전성 검증", "Collaborative Workcell Safety Verification", "실제 환경에서 협동 작업의 안전성 확인", "Verify safety of collaborative operations in actual environment"),
            ("사용자 가이드 작성", "User Guide Documentation", "협동로봇 사용자를 위한 상세 매뉴얼 작성", "Write detailed manual for collaborative robot users"),
            ("협동 작업 사이클 타임 측정", "Collaborative Work Cycle Time Measurement", "인간-로봇 협력 작업의 소요 시간 측정", "Measure time required for human-robot collaborative work"),
            ("안전성 평가 보고서", "Safety Assessment Report", "협동 작업의 안전성 평가 결과 보고", "Report safety assessment results for collaborative work"),
            ("작업 개선 제안", "Work Improvement Proposal", "협동 작업 효율 개선 방안 제안", "Propose improvements to collaborative work efficiency"),
            ("인간공학 평가", "Ergonomic Assessment", "작업자의 피로도 및 편의성 평가", "Assess worker fatigue and convenience"),
            ("협동 로봇 배치 최적화", "Collaborative Robot Placement Optimization", "작업 공간 내 협동로봇의 최적 위치 결정", "Determine optimal placement of collaborative robots in workspace"),
        ],
    },
    "autonomous-mobile-robot": {
        "skill": [
            ("환경 맵 작성", "Environment Mapping", "LiDAR, 카메라를 이용한 환경 맵 생성", "Generate environment map using LiDAR and camera"),
            ("경로 계획 매개변수 조정", "Path Planning Parameter Adjustment", "목표점까지의 경로 계획 최적화", "Optimize path planning to destination"),
            ("충돌 회피 설정", "Collision Avoidance Configuration", "장애물 감지 및 회피 설정", "Configure obstacle detection and avoidance"),
            ("멀티-로봇 교통 관제", "Multi-Robot Traffic Management", "여러 AMR의 움직임을 조율하여 충돌 방지", "Coordinate movements of multiple AMRs to prevent collisions"),
            ("함대 성능 모니터링", "Fleet Performance Monitoring", "전체 함대의 운영 현황 모니터링", "Monitor operational status of entire robot fleet"),
            ("GPS 및 GNSS 활용", "GPS and GNSS Utilization", "글로벌 위치 정보를 이용한 네비게이션", "Navigation using global positioning information"),
            ("수동 조종 모드", "Manual Control Mode", "필요시 원격으로 AMR 제어", "Remotely control AMR when necessary"),
            ("스테이션 도킹 설정", "Station Docking Configuration", "충전소 및 화물 거래소 자동 도킹 설정", "Configure automatic docking at charging and transfer stations"),
            ("네트워크 통신 설정", "Network Communication Configuration", "중앙 제어 시스템과 통신 설정", "Configure communication with central control system"),
        ],
        "competence": [
            ("제조 환경 맵 생성", "Manufacturing Environment Mapping", "실제 제조 현장의 정확한 맵 생성", "Generate accurate map of actual manufacturing facility"),
            ("맵 정확도 검증", "Map Accuracy Verification", "생성된 맵의 정확성 확인 및 개선", "Verify and improve accuracy of generated map"),
            ("자율 주행 운영", "Autonomous Navigation Operation", "정해진 경로 내에서 자율 주행 실현", "Achieve autonomous navigation within specified routes"),
            ("충돌 발생 시 분석", "Collision Incident Analysis", "충돌 발생 원인 파악 및 개선", "Identify causes of collisions and improve"),
            ("운영 매뉴얼 작성", "Operations Manual Documentation", "AMR 운영자를 위한 상세 매뉴얼 작성", "Write detailed manual for AMR operators"),
            ("성능 지표 분석", "Performance Metrics Analysis", "주행 거리, 배터리 소모, 업타임 등 분석", "Analyze traveled distance, battery consumption, uptime, etc."),
            ("확장성 계획", "Scalability Planning", "로봇 수 증가 시 시스템 확장 방안", "Plan system expansion as robot count increases"),
        ],
    },
    "robot-maintenance-diagnostics": {
        "skill": [
            ("로봇 상태 모니터링", "Robot Status Monitoring", "센서 데이터를 통한 로봇 상태 실시간 모니터링", "Real-time robot status monitoring through sensor data"),
            ("트렌드 분석", "Trend Analysis", "시간에 따른 성능 변화 추적 및 분석", "Track and analyze performance changes over time"),
            ("고장 코드 해석", "Fault Code Interpretation", "로봇 진단 코드의 의미 파악", "Understand robot diagnostic codes"),
            ("베어링 검사 및 교체", "Bearing Inspection and Replacement", "베어링 마모 상태 확인 및 교체", "Check bearing wear and replace"),
            ("기어 및 모터 검사", "Gear and Motor Inspection", "기어 손상, 모터 성능 검사", "Inspect gear damage and motor performance"),
            ("소프트웨어 업그레이드", "Software Upgrade", "로봇 펌웨어 및 소프트웨어 업데이트", "Update robot firmware and software"),
            ("성능 벤치마크 테스트", "Performance Benchmark Testing", "정해진 기준으로 로봇 성능 측정", "Measure robot performance against standards"),
            ("부품 청소 및 검사", "Component Cleaning and Inspection", "부품의 먼지, 이물질 제거 및 상태 확인", "Clean components and check condition"),
            ("윤활유 교체", "Lubricant Replacement", "로봇 관절 및 기어의 윤활유 교체", "Replace lubricant in robot joints and gears"),
        ],
        "competence": [
            ("예방적 유지보수 계획 수립", "Preventive Maintenance Plan Development", "장기 유지보수 일정 개발 및 실행", "Develop and execute long-term maintenance schedule"),
            ("긴급 고장 대응", "Emergency Fault Response", "생산 중단 상황에서 신속한 복구", "Quickly restore service during production stoppage"),
            ("부품 수명 예측", "Component Lifespan Prediction", "부품 교체 시기 미리 예측", "Predict when components need replacement"),
            ("재고 관리", "Spare Parts Inventory Management", "필요한 예비 부품 보유 및 관리", "Maintain and manage spare parts inventory"),
            ("유지보수 보고서 작성", "Maintenance Report Documentation", "유지보수 활동 상세 기록 및 보고", "Document and report maintenance activities in detail"),
            ("성능 지표 개선", "Performance Metrics Improvement", "가동률, 신뢰도 등 개선", "Improve availability, reliability, and other metrics"),
            ("부품 공급업체 관리", "Supplier Relationship Management", "부품 공급업체와의 협력 및 품질 관리", "Collaborate with suppliers and manage quality"),
        ],
    },
    "digital-twin-simulation": {
        "skill": [
            ("3D 모델 CAD 임포트", "3D CAD Model Import", "CAD 파일을 시뮬레이션 환경으로 가져오기", "Import CAD files into simulation environment"),
            ("로봇 시뮬레이션 환경 구성", "Robot Simulation Environment Setup", "Gazebo, CoppeliaSim 등에서 로봇 환경 설정", "Configure robot environment in Gazebo, CoppeliaSim, etc."),
            ("생산 라인 레이아웃 검증", "Production Line Layout Validation", "장비 배치의 충돌 여부 확인", "Verify equipment placement for collisions"),
            ("사이클 타임 시뮬레이션", "Cycle Time Simulation", "프로그램 실행 시간 측정", "Measure program execution time"),
            ("실제 로봇 동기화", "Real Robot Synchronization", "시뮬레이션과 실제 로봇 동기화", "Synchronize simulation with actual robot"),
            ("성능 데이터 수집", "Performance Data Collection", "시뮬레이션에서 성능 지표 추출", "Extract performance metrics from simulation"),
            ("시나리오 시뮬레이션", "Scenario Simulation", "고장, 병목 상황 시뮬레이션", "Simulate failure and bottleneck scenarios"),
            ("최적화 시뮬레이션", "Optimization Simulation", "최적의 파라미터 찾기 위한 시뮬레이션", "Simulate to find optimal parameters"),
            ("결과 분석 및 시각화", "Result Analysis and Visualization", "시뮬레이션 결과를 그래프, 표로 표현", "Present simulation results as graphs and tables"),
        ],
        "competence": [
            ("신규 라인 설계 시뮬레이션", "New Production Line Design Simulation", "신규 제조 라인 설계 시 시뮬레이션 검증 완료", "Complete simulation validation for new production line design"),
            ("설계 리스크 식별", "Design Risk Identification", "시뮬레이션 기반 설계 문제 사전 발견", "Identify design issues through simulation before implementation"),
            ("운영 시나리오 시뮬레이션", "Operational Scenario Simulation", "고장, 지연 등 운영 상황 사전 검토", "Pre-evaluate operational situations including failures and delays"),
            ("최적화된 사이클 타임 달성", "Optimized Cycle Time Achievement", "시뮬레이션으로 검증된 최적 사이클 타임 달성", "Achieve optimized cycle time verified through simulation"),
            ("디지털트윈 유지보수", "Digital Twin Maintenance", "시뮬레이션 모델을 최신 상태로 유지", "Keep simulation model up to date"),
            ("설계-운영 연동", "Design-Operations Integration", "설계 변경 사항을 빠르게 운영에 반영", "Quickly reflect design changes in operations"),
            ("의사결정 지원", "Decision Support", "시뮬레이션 기반 운영 개선 방안 제시", "Propose operational improvements based on simulation"),
        ],
    },
    "agentic-ai-manufacturing": {
        "skill": [
            ("공정 에이전트 설계", "Process Agent Design", "공정 목표와 제약을 반영한 AI 에이전트 역할·행동 설계", "Design agent roles and behaviors reflecting process goals and constraints"),
            ("에이전트 도구 연동", "Agent Tool Integration", "MES, 설비, 데이터 API를 에이전트 도구로 연결", "Connect MES, equipment, and data APIs as agent tools"),
            ("프롬프트 설계 및 평가", "Prompt Design and Evaluation", "제조 업무용 프롬프트 작성과 응답 품질 평가", "Author manufacturing prompts and evaluate response quality"),
            ("멀티 에이전트 오케스트레이션", "Multi-Agent Orchestration", "여러 에이전트의 역할 분담과 협업 흐름 구성", "Coordinate role division and collaboration flows across agents"),
            ("MES 워크플로 자동화", "MES Workflow Automation", "반복적인 MES 업무 흐름을 에이전트로 자동화", "Automate repetitive MES workflows with agents"),
            ("작업지시 자동 생성", "Automated Work Order Generation", "생산 상황을 반영한 작업지시 자동 작성", "Automatically create work orders reflecting production status"),
            ("품질 이상 자동 판정", "Automated Quality Judgment", "검사 데이터 기반 불량 판정 및 원인 후보 제시", "Judge defects from inspection data and suggest probable causes"),
            ("휴먼-인-더-루프 승인 흐름 설계", "Human-in-the-Loop Approval Design", "자동 판단에 사람 승인 단계를 배치하는 흐름 설계", "Design flows placing human approval steps around automated decisions"),
            ("에이전트 가드레일 구성", "Agent Guardrail Configuration", "행동 범위 제한, 금지 규칙, 이상 행동 차단 설정", "Configure action limits, prohibition rules, and anomaly blocking"),
        ],
        "competence": [
            ("자율 운영 예외 대응", "Autonomous Operation Exception Handling", "에이전트 자율 운영 중 예외 상황을 안전하게 수습", "Safely handle exceptions during autonomous agent operation"),
            ("품질 이상 자동 격리 운영", "Automated Quality Quarantine Operation", "불량 판정품의 자동 격리 프로세스 운영 및 검증", "Operate and verify automated quarantine of judged defects"),
            ("생산계획 자동 수립 운영", "Automated Production Planning Operation", "APS 기반 자동 계획 수립을 운영하고 결과 검증", "Operate APS-based automated planning and verify outcomes"),
            ("에이전트 성과 평가", "Agent Performance Evaluation", "자동화율, 개입률, 오판정률 등 에이전트 성과 측정", "Measure agent performance including automation, intervention, and error rates"),
            ("에이전트 안전성 검증", "Agent Safety Validation", "배포 전 에이전트 행동의 안전성·규정 준수 검증 완료", "Complete safety and compliance validation of agent behavior before deployment"),
            ("에이전트 감사 추적 운영", "Agent Audit Trail Operation", "에이전트 판단·행동 이력의 기록과 추적 체계 운영", "Operate logging and traceability for agent decisions and actions"),
            ("자율화 확산 계획", "Autonomy Scale-Up Planning", "검증된 자율화를 타 공정으로 확산하는 로드맵 수립", "Plan roadmaps to scale validated autonomy to other processes"),
        ],
    },
}

# ==================== 메인 데이터 생성 로직 ====================

def generate_skill_id(domain_code: str, index: int) -> str:
    """스킬 ID 생성: RSF-[도메인코드]-[번호]"""
    return f"RSF-{domain_code}-{index:03d}"


def generate_internal_uri(domain_code: str, index: int) -> str:
    """내부 식별자임을 명확히 드러내는 URN 생성"""
    return f"urn:rsf:skill:{domain_code.lower()}-{index:04d}"


def create_skill_object(
    domain: str,
    domain_code: str,
    skill_type: str,  # "knowledge", "skill", "competence"
    label_ko: str,
    label_en: str,
    description_ko: str,
    description_en: str,
    proficiency_level: int,
    role_mappings: List[str],
    parent_skill_id: str = None,
    related_skills: List[Dict[str, Any]] = None,
    smartfactory_context: str = None,
    index: int = 1,
) -> Dict[str, Any]:
    """스킬 객체 생성"""
    skill_id = generate_skill_id(domain_code, index)

    return {
        "skill_id": skill_id,
        "domain": domain,
        "domain_en": DOMAINS[domain]["name_en"],
        "internal_uri": generate_internal_uri(domain_code, index),
        # 실제 ESCO 매핑을 확인한 경우에만 공식 URI를 채운다.
        "esco_uri": None,
        "preferred_label_ko": label_ko,
        "preferred_label_en": label_en,
        "description_ko": description_ko,
        "description_en": description_en,
        "skill_type": skill_type,
        "proficiency_level": proficiency_level,
        "role_mapping": role_mappings,
        "parent_skill_id": parent_skill_id,
        "related_skills": related_skills or [],
        "esco_broader": None,
        "smartfactory_context": smartfactory_context,
    }


def add_relation(
    skills_by_id: Dict[str, Dict[str, Any]],
    source_id: str,
    target_id: str,
    relation_type: str,
    weight: float,
) -> None:
    """중복 없이 유형 관계를 추가한다."""
    if source_id == target_id:
        return

    relations = skills_by_id[source_id]["related_skills"]
    if any(
        relation["target"] == target_id and relation["type"] == relation_type
        for relation in relations
    ):
        return

    relations.append({
        "target": target_id,
        "type": relation_type,
        "weight": weight,
        "source": "heuristic",
    })


def add_symmetric_relation(
    skills_by_id: Dict[str, Dict[str, Any]],
    left_id: str,
    right_id: str,
    relation_type: str,
    weight: float,
) -> None:
    """무향 관계는 양쪽에 함께 기록한다."""
    add_relation(skills_by_id, left_id, right_id, relation_type, weight)
    add_relation(skills_by_id, right_id, left_id, relation_type, weight)


def connect_skills(skills: List[Dict[str, Any]]) -> None:
    """최소 연결망을 만들고 부모 관계의 의미를 보존한다."""
    skills_by_id = {skill["skill_id"]: skill for skill in skills}
    skills_by_domain: Dict[str, List[Dict[str, Any]]] = {}

    for skill in skills:
        skills_by_domain.setdefault(skill["domain"], []).append(skill)
        if skill["parent_skill_id"]:
            add_relation(
                skills_by_id,
                skill["skill_id"],
                skill["parent_skill_id"],
                "specialization",
                1.0,
            )

    # 각 도메인을 고리로 연결하면 모든 스킬이 최소 2개의 현장 동반 관계를 가진다.
    for domain_skills in skills_by_domain.values():
        for index, skill in enumerate(domain_skills):
            next_skill = domain_skills[(index + 1) % len(domain_skills)]
            add_symmetric_relation(
                skills_by_id,
                skill["skill_id"],
                next_skill["skill_id"],
                "co_required",
                0.7,
            )

    # 인접 도메인의 대표 스킬을 연결해 도메인 간 탐색 경로를 만든다.
    domain_groups = list(skills_by_domain.values())
    for index, domain_skills in enumerate(domain_groups):
        next_domain_skills = domain_groups[(index + 1) % len(domain_groups)]
        add_symmetric_relation(
            skills_by_id,
            domain_skills[0]["skill_id"],
            next_domain_skills[0]["skill_id"],
            "cross_domain",
            0.6,
        )


def generate_robot_smartfactory_data() -> List[Dict[str, Any]]:
    """전체 로봇테크 for 스마트팩토리 데이터 생성"""
    all_skills = []

    for domain, domain_info in DOMAINS.items():
        domain_code = domain_info["code"]
        index = 1

        # Knowledge 스킬 생성
        knowledge_list = KNOWLEDGE_SKILLS.get(domain, [])
        for kn in knowledge_list:
            skill = create_skill_object(
                domain=domain,
                domain_code=domain_code,
                skill_type="knowledge",
                label_ko=kn["label_ko"],
                label_en=kn["label_en"],
                description_ko=kn["description_ko"],
                description_en=kn["description_en"],
                proficiency_level=kn["proficiency"],
                role_mappings=["engineer", "developer"],  # Knowledge는 엔지니어, 개발자 대상
                smartfactory_context=f"{domain_info['name_ko']}의 이론적 기초",
                index=index,
            )
            all_skills.append(skill)
            index += 1

        # Skill 및 Competence 생성
        skill_competence = SKILL_COMPETENCE_TEMPLATES.get(domain, {})
        skill_list = skill_competence.get("skill", [])
        competence_list = skill_competence.get("competence", [])

        # Skill 스킬 생성
        for i, (label_ko, label_en, desc_ko, desc_en) in enumerate(skill_list):
            # proficiency_level은 스킬 타입에 따라 분배
            proficiency = 2 if i < 3 else (3 if i < 7 else 2)

            # 역할 매핑: domain과 index에 따라 다양하게 분배
            if domain == "digital-twin-simulation":
                roles = ["engineer", "developer"]
            elif domain == "agentic-ai-manufacturing":
                roles = ["engineer", "developer"]
            elif domain == "collaborative-robot":
                roles = ["operator", "engineer"]
            else:
                roles = ["operator", "engineer"] if i < 5 else ["engineer"]

            skill = create_skill_object(
                domain=domain,
                domain_code=domain_code,
                skill_type="skill",
                label_ko=label_ko,
                label_en=label_en,
                description_ko=desc_ko,
                description_en=desc_en,
                proficiency_level=proficiency,
                role_mappings=roles,
                parent_skill_id=f"RSF-{domain_code}-{min(i // 2 + 1, 5):03d}" if i < len(knowledge_list) else None,
                smartfactory_context=f"{domain_info['name_ko']} 현장에서 {label_ko} 역량 구현",
                index=index,
            )
            all_skills.append(skill)
            index += 1

        # Competence 스킬 생성
        for i, (label_ko, label_en, desc_ko, desc_en) in enumerate(competence_list):
            # proficiency_level은 competence이므로 3~4 레벨
            proficiency = 3 if i < 4 else 4
            roles = ["operator", "engineer"] if i < 3 else ["engineer"]

            skill = create_skill_object(
                domain=domain,
                domain_code=domain_code,
                skill_type="competence",
                label_ko=label_ko,
                label_en=label_en,
                description_ko=desc_ko,
                description_en=desc_en,
                proficiency_level=proficiency,
                role_mappings=roles,
                parent_skill_id=f"RSF-{domain_code}-{len(knowledge_list) + (i // 2) + 1:03d}",
                smartfactory_context=f"현장 검증: {label_ko} 수행 능력 입증",
                index=index,
            )
            all_skills.append(skill)
            index += 1

    connect_skills(all_skills)
    return all_skills


# ==================== 메인 실행 ====================

def main():
    print("🚀 로봇테크 for 스마트팩토리 스킬 데이터 생성 시작...")

    # 데이터 생성
    skills = generate_robot_smartfactory_data()

    # JSON 파일로 저장
    output_path = Path("public/data/robot-smartfactory.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(skills, f, ensure_ascii=False, indent=2)

    print(f"✅ 데이터 생성 완료: {output_path}")
    print(f"   총 스킬 수: {len(skills)}개")

    # 통계 출력
    stats_by_domain = {}
    stats_by_type = {}
    stats_by_role = {}
    stats_by_proficiency = {}

    for skill in skills:
        domain = skill["domain"]
        skill_type = skill["skill_type"]
        proficiency = skill["proficiency_level"]

        stats_by_domain[domain] = stats_by_domain.get(domain, 0) + 1
        stats_by_type[skill_type] = stats_by_type.get(skill_type, 0) + 1
        stats_by_proficiency[proficiency] = stats_by_proficiency.get(proficiency, 0) + 1

        for role in skill["role_mapping"]:
            stats_by_role[role] = stats_by_role.get(role, 0) + 1

    print("\n📊 도메인별 분포:")
    for domain in DOMAINS.keys():
        count = stats_by_domain.get(domain, 0)
        name = DOMAINS[domain]["name_ko"]
        print(f"   {name}: {count}개")

    print("\n📊 스킬 타입별 분포:")
    for skill_type, count in sorted(stats_by_type.items()):
        print(f"   {skill_type}: {count}개")

    print("\n📊 역할별 분포:")
    for role, count in sorted(stats_by_role.items()):
        print(f"   {role}: {count}개")

    print("\n📊 숙련도 레벨별 분포:")
    for level in sorted(stats_by_proficiency.keys()):
        count = stats_by_proficiency[level]
        print(f"   Level {level}: {count}개")

    print("\n✨ 데이터 생성 완료!")


if __name__ == "__main__":
    main()
