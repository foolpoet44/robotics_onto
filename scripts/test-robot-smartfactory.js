#!/usr/bin/env node

/**
 * 로봇테크 for 스마트팩토리 프로젝트 종합 검증 테스트
 *
 * 테스트 범위:
 * 1. 파일 존재 여부 및 접근성
 * 2. JSON 형식 및 구조 유효성
 * 3. 데이터 무결성 (스키마 준수)
 * 4. 비즈니스 로직 검증 (도메인, 역할, 숙련도)
 * 5. 한영 데이터 완성도
 * 6. ESCO 표준 준수
 * 7. 설계 문서와 데이터 일관성
 */

const fs = require("fs");
const path = require("path");

// ==================== 테스트 헬퍼 ====================

let testCount = 0;
let passCount = 0;
let failCount = 0;
const failedTests = [];

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  } else {
    failCount++;
    failedTests.push(message);
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  }
}

function testSection(title) {
  console.log(
    `\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
}

function testResult() {
  console.log(
    `\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(`${colors.bright}테스트 결과 요약${colors.reset}`);
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(`총 테스트: ${testCount}개`);
  console.log(`${colors.green}통과: ${passCount}개${colors.reset}`);
  console.log(`${colors.red}실패: ${failCount}개${colors.reset}`);

  if (failCount > 0) {
    console.log(`\n${colors.red}${colors.bright}실패한 테스트:${colors.reset}`);
    failedTests.forEach((test) => {
      console.log(`  - ${test}`);
    });
  }

  const percentage = ((passCount / testCount) * 100).toFixed(1);
  console.log(`\n통과율: ${percentage}%`);

  if (failCount === 0) {
    console.log(
      `\n${colors.green}${colors.bright}🎉 모든 테스트 통과!${colors.reset}`,
    );
    return true;
  } else {
    console.log(
      `\n${colors.red}${colors.bright}⚠️ 일부 테스트 실패${colors.reset}`,
    );
    return false;
  }
}

// ==================== 테스트 로직 ====================

class RobotSmartFactoryTester {
  constructor() {
    this.skillData = null;
    this.designDoc = null;
    this.expectedDomains = [
      "industrial-robot-control",
      "machine-vision-sensor",
      "collaborative-robot",
      "autonomous-mobile-robot",
      "robot-maintenance-diagnostics",
      "digital-twin-simulation",
      "agentic-ai-manufacturing",
    ];
    this.expectedRoles = ["operator", "engineer", "developer"];
    this.expectedSkillTypes = ["knowledge", "skill", "competence"];
  }

  // 테스트 1: 파일 존재 및 접근성
  testFileExistence() {
    testSection("테스트 1: 파일 존재 및 접근성");

    const files = [
      "public/data/robot-smartfactory.json",
      "docs/SMARTFACTORY_SKILL_DESIGN.md",
      "scripts/generate-robot-smartfactory-data.py",
      "scripts/validate-robot-data.js",
      "scripts/test-robot-smartfactory.js",
    ];

    files.forEach((file) => {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);
      assert(exists, `파일 존재: ${file}`);
    });
  }

  // 테스트 2: JSON 로드 및 기본 구조
  testJsonLoading() {
    testSection("테스트 2: JSON 로드 및 기본 구조");

    try {
      const dataPath = path.join(
        process.cwd(),
        "public/data/robot-smartfactory.json",
      );
      const content = fs.readFileSync(dataPath, "utf-8");
      this.skillData = JSON.parse(content);
      assert(Array.isArray(this.skillData), "JSON은 배열 형식이어야 함");
      assert(this.skillData.length > 0, "JSON에 최소 1개 이상의 스킬 포함");
    } catch (error) {
      assert(false, `JSON 파일 로드 실패: ${error.message}`);
      throw error;
    }
  }

  // 테스트 3: 데이터 스키마 검증
  testDataSchema() {
    testSection("테스트 3: 데이터 스키마 검증");

    const requiredFields = [
      "skill_id",
      "domain",
      "domain_en",
      "internal_uri",
      "preferred_label_ko",
      "preferred_label_en",
      "description_ko",
      "description_en",
      "skill_type",
      "proficiency_level",
      "role_mapping",
    ];

    let schemaErrors = 0;
    this.skillData.forEach((skill, index) => {
      requiredFields.forEach((field) => {
        if (!(field in skill) || skill[field] === null || skill[field] === "") {
          schemaErrors++;
          if (schemaErrors <= 3) {
            // 처음 3개 에러만 표시
            assert(
              false,
              `스킬 #${index} (${skill.skill_id}): 필수 필드 '${field}' 누락`,
            );
          }
        }
      });
    });

    if (schemaErrors === 0) {
      assert(
        true,
        `모든 스킬이 필수 필드를 포함 (검사: ${this.skillData.length}개)`,
      );
    } else if (schemaErrors > 3) {
      assert(false, `추가 ${schemaErrors - 3}개의 스키마 오류 발견`);
    }
  }

  // 테스트 4: 도메인 검증
  testDomains() {
    testSection("테스트 4: 도메인 검증");

    const domainStats = {};
    this.skillData.forEach((skill) => {
      if (!domainStats[skill.domain]) {
        domainStats[skill.domain] = 0;
      }
      domainStats[skill.domain]++;
    });

    // 모든 예상 도메인 존재 확인
    this.expectedDomains.forEach((domain) => {
      const exists = domain in domainStats;
      assert(exists, `도메인 존재: ${domain}`);
    });

    // 도메인별 스킬 수 확인
    this.expectedDomains.forEach((domain) => {
      const count = domainStats[domain] || 0;
      assert(
        count >= 20,
        `도메인 '${domain}': 최소 20개 이상의 스킬 (현재: ${count}개)`,
      );
    });
  }

  // 테스트 5: 역할 매핑 검증
  testRoleMapping() {
    testSection("테스트 5: 역할 매핑 검증");

    const roleStats = {};
    this.expectedRoles.forEach((role) => {
      roleStats[role] = 0;
    });

    this.skillData.forEach((skill) => {
      if (!Array.isArray(skill.role_mapping)) {
        assert(false, `스킬 ${skill.skill_id}: role_mapping은 배열이어야 함`);
        return;
      }

      skill.role_mapping.forEach((role) => {
        if (role in roleStats) {
          roleStats[role]++;
        }
      });
    });

    // 모든 역할 포함 확인
    this.expectedRoles.forEach((role) => {
      const count = roleStats[role];
      assert(count > 0, `역할 '${role}' 포함됨 (${count}개 스킬)`);
    });
  }

  // 테스트 6: 숙련도 레벨 검증
  testProficiencyLevels() {
    testSection("테스트 6: 숙련도 레벨 검증");

    const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let invalidLevels = 0;

    this.skillData.forEach((skill) => {
      const level = skill.proficiency_level;
      if (level >= 1 && level <= 4) {
        levelStats[level]++;
      } else {
        invalidLevels++;
      }
    });

    assert(invalidLevels === 0, `모든 proficiency_level이 1~4 범위 내`);

    // 모든 레벨이 표현되는지 확인
    for (let level = 1; level <= 4; level++) {
      const count = levelStats[level];
      assert(count > 0, `Level ${level} 존재 (${count}개 스킬)`);
    }
  }

  // 테스트 7: 스킬 타입 검증
  testSkillTypes() {
    testSection("테스트 7: 스킬 타입 검증");

    const typeStats = {};
    this.expectedSkillTypes.forEach((type) => {
      typeStats[type] = 0;
    });

    this.skillData.forEach((skill) => {
      if (skill.skill_type in typeStats) {
        typeStats[skill.skill_type]++;
      }
    });

    // 모든 타입이 표현되는지 확인
    this.expectedSkillTypes.forEach((type) => {
      const count = typeStats[type];
      assert(count > 0, `스킬 타입 '${type}' 존재 (${count}개)`);
    });

    // 3층 계층 구조 비율 확인
    const totalCount = this.skillData.length;
    const knowledgeRatio = (
      (typeStats["knowledge"] / totalCount) *
      100
    ).toFixed(1);
    const skillRatio = ((typeStats["skill"] / totalCount) * 100).toFixed(1);
    const competenceRatio = (
      (typeStats["competence"] / totalCount) *
      100
    ).toFixed(1);

    assert(
      typeStats["knowledge"] > 0 &&
        typeStats["skill"] > 0 &&
        typeStats["competence"] > 0,
      `계층 구조 균형: Knowledge ${knowledgeRatio}%, Skill ${skillRatio}%, Competence ${competenceRatio}%`,
    );
  }

  // 테스트 8: 한영 데이터 완성도
  testBilingualData() {
    testSection("테스트 8: 한영 데이터 완성도");

    let missingKorean = 0;
    let missingEnglish = 0;

    this.skillData.forEach((skill, index) => {
      if (!skill.preferred_label_ko || skill.preferred_label_ko.trim() === "") {
        if (missingKorean <= 2) {
          assert(false, `스킬 #${index}: 한글 레이블 누락`);
        }
        missingKorean++;
      }

      if (!skill.preferred_label_en || skill.preferred_label_en.trim() === "") {
        if (missingEnglish <= 2) {
          assert(false, `스킬 #${index}: 영문 레이블 누락`);
        }
        missingEnglish++;
      }

      if (!skill.description_ko || skill.description_ko.trim() === "") {
        if (missingKorean <= 2) {
          assert(false, `스킬 #${index}: 한글 설명 누락`);
        }
      }

      if (!skill.description_en || skill.description_en.trim() === "") {
        if (missingEnglish <= 2) {
          assert(false, `스킬 #${index}: 영문 설명 누락`);
        }
      }
    });

    if (missingKorean === 0 && missingEnglish === 0) {
      assert(true, `모든 스킬의 한영 데이터 완성`);
    }
  }

  // 테스트 9: ESCO URI 형식 검증
  testEscoUri() {
    testSection("테스트 9: ESCO URI 형식 검증");

    let validCount = 0;
    let invalidCount = 0;

    this.skillData.forEach((skill) => {
      const internalUri = skill.internal_uri;
      const escoUri = skill.esco_uri;
      const validInternalUri = internalUri.startsWith("urn:rsf:skill:");
      const validEscoUri =
        escoUri === null ||
        /^http:\/\/data\.europa\.eu\/esco\/skill\/[0-9a-f-]+$/i.test(escoUri);
      if (validInternalUri && validEscoUri) {
        validCount++;
      } else {
        invalidCount++;
        if (invalidCount <= 3) {
          assert(
            false,
            `스킬 ${skill.skill_id}: 유효하지 않은 출처 URI 형식 (${internalUri}, ${escoUri})`,
          );
        }
      }
    });

    if (invalidCount === 0) {
      assert(true, `모든 출처 URI가 유효한 형식 (총 ${validCount}개)`);
    } else if (invalidCount > 3) {
      assert(false, `추가 ${invalidCount - 3}개의 URI 형식 오류`);
    }
  }

  // 테스트 10: 스킬 ID 형식 검증
  testSkillIdFormat() {
    testSection("테스트 10: 스킬 ID 형식 검증");

    const skillIdRegex = /^RSF-[A-Z]+(-\d{3})$/;
    let validCount = 0;
    let invalidCount = 0;

    this.skillData.forEach((skill) => {
      if (skillIdRegex.test(skill.skill_id)) {
        validCount++;
      } else {
        invalidCount++;
        if (invalidCount <= 3) {
          assert(false, `유효하지 않은 스킬 ID 형식: ${skill.skill_id}`);
        }
      }
    });

    if (invalidCount === 0) {
      assert(
        true,
        `모든 스킬 ID가 'RSF-[CODE]-[NUMBER]' 형식 (총 ${validCount}개)`,
      );
    }
  }

  // 테스트 11: 스마트팩토리 컨텍스트 검증
  testSmartFactoryContext() {
    testSection("테스트 11: 스마트팩토리 컨텍스트 검증");

    let contextCount = 0;
    let missingCount = 0;

    this.skillData.forEach((skill) => {
      if (
        skill.smartfactory_context &&
        skill.smartfactory_context.trim() !== ""
      ) {
        contextCount++;
      } else {
        missingCount++;
      }
    });

    const contextRatio = ((contextCount / this.skillData.length) * 100).toFixed(
      1,
    );
    assert(
      contextCount > 0,
      `스마트팩토리 컨텍스트 포함: ${contextRatio}% (${contextCount}개 스킬)`,
    );

    if (missingCount > 0) {
      assert(false, `컨텍스트 누락: ${missingCount}개 스킬`);
    }
  }

  // 테스트 12: 부모-자식 관계 무결성
  testParentChildRelationship() {
    testSection("테스트 12: 부모-자식 관계 무결성");

    const skillIds = new Set(this.skillData.map((s) => s.skill_id));
    let validParents = 0;
    let orphans = 0;

    this.skillData.forEach((skill) => {
      if (skill.parent_skill_id) {
        if (skillIds.has(skill.parent_skill_id)) {
          validParents++;
        } else {
          orphans++;
          if (orphans <= 3) {
            assert(
              false,
              `고아 스킬: ${skill.skill_id} (부모: ${skill.parent_skill_id} 없음)`,
            );
          }
        }
      }
    });

    if (orphans === 0) {
      assert(true, `모든 부모-자식 관계가 유효 (부모 관계: ${validParents}개)`);
    }
  }

  // 테스트 13: 전체 스킬 수 목표 달성
  testSkillCountTarget() {
    testSection("테스트 13: 전체 스킬 수 목표 달성");

    const minTarget = 120;
    const actualCount = this.skillData.length;
    const achievementRatio = ((actualCount / minTarget) * 100).toFixed(1);

    assert(
      actualCount >= minTarget,
      `스킬 수 목표 달성: ${actualCount}개 (목표: ${minTarget}개 이상, 달성률: ${achievementRatio}%)`,
    );
  }

  // 테스트 14: 도메인별 균형 검증
  testDomainBalance() {
    testSection("테스트 14: 도메인별 균형 검증");

    const domainStats = {};
    this.skillData.forEach((skill) => {
      domainStats[skill.domain] = (domainStats[skill.domain] || 0) + 1;
    });

    const counts = Object.values(domainStats);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const avgCount = (
      counts.reduce((a, b) => a + b, 0) / counts.length
    ).toFixed(1);

    const isBalanced = maxCount - minCount <= 2;
    assert(
      isBalanced,
      `도메인 균형: 최소 ${minCount}개, 최대 ${maxCount}개, 평균 ${avgCount}개 (편차 ${maxCount - minCount}개)`,
    );
  }

  // 테스트 15: 설계 문서 존재 및 일관성
  testDesignDocConsistency() {
    testSection("테스트 15: 설계 문서 존재 및 일관성");

    try {
      const docPath = path.join(
        process.cwd(),
        "docs/SMARTFACTORY_SKILL_DESIGN.md",
      );
      const docContent = fs.readFileSync(docPath, "utf-8");
      this.designDoc = docContent;

      // 설계 문서에 모든 도메인이 명시되어 있는지 확인 (영문명 기반)
      const domainKeywords = [
        "Industrial Robot Control",
        "Machine Vision",
        "Collaborative Robot",
        "AMR/AGV",
        "Maintenance & Diagnostics",
        "Digital Twin",
        "Agentic AI Manufacturing",
      ];

      let allDomainsInDoc = true;
      domainKeywords.forEach((keyword) => {
        if (!docContent.includes(keyword)) {
          allDomainsInDoc = false;
        }
      });

      assert(allDomainsInDoc, "설계 문서에 모든 도메인이 포함됨");
      assert(
        docContent.includes("3층") ||
          docContent.includes("Knowledge") ||
          docContent.includes("Competence"),
        "설계 문서에 3층 계층 구조 설명 포함",
      );
      assert(
        docContent.includes("Operator") || docContent.includes("operator"),
        "설계 문서에 역할 정의 포함",
      );
    } catch (error) {
      assert(false, `설계 문서 읽기 실패: ${error.message}`);
    }
  }

  // 전체 테스트 실행
  runAll() {
    console.log(
      `${colors.bright}${colors.blue}🚀 로봇테크 for 스마트팩토리 종합 검증 테스트 시작${colors.reset}`,
    );
    console.log(`시간: ${new Date().toLocaleString("ko-KR")}`);

    this.testFileExistence();
    this.testJsonLoading();
    this.testDataSchema();
    this.testDomains();
    this.testRoleMapping();
    this.testProficiencyLevels();
    this.testSkillTypes();
    this.testBilingualData();
    this.testEscoUri();
    this.testSkillIdFormat();
    this.testSmartFactoryContext();
    this.testParentChildRelationship();
    this.testSkillCountTarget();
    this.testDomainBalance();
    this.testDesignDocConsistency();

    const allPassed = testResult();
    return allPassed;
  }
}

// ==================== 메인 실행 ====================

const tester = new RobotSmartFactoryTester();
const success = tester.runAll();

process.exit(success ? 0 : 1);
