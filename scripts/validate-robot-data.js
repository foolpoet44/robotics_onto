#!/usr/bin/env node

/**
 * 로봇테크 for 스마트팩토리 스킬 데이터 검증 스크립트
 *
 * 검증 항목:
 * 1. 전체 스킬 수 카운트 (목표: 120개 이상)
 * 2. 도메인별 분포 (6개 도메인 모두 존재하는지)
 * 3. skill_type별 분포 (knowledge/skill/competence 비율)
 * 4. role_mapping 커버리지 (3개 역할 모두 커버)
 * 5. 고아 스킬 탐지 (parent_skill_id가 있지만 해당 ID가 없는 경우)
 * 6. related_skills 상호참조 검증
 */

const fs = require("fs");
const path = require("path");
const {
  getRelationTarget,
  validateOntologySemantics,
} = require("./lib/ontology-validation");
const {
  validateOrganizationMapping,
} = require("./lib/organization-validation");
const { loadCollegeResolver } = require("./lib/college-resolver-loader");

// ==================== 색상 출력 헬퍼 ====================
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log("\n" + "=".repeat(60));
  log(` ${title}`, "cyan");
  console.log("=".repeat(60));
}

// ==================== 검증 로직 ====================

class RobotDataValidator {
  constructor(dataPath, options = {}) {
    this.dataPath = dataPath;
    this.strict = options.strict ?? false;
    this.data = null;
    this.errors = [];
    this.warnings = [];
  }

  load() {
    try {
      const content = fs.readFileSync(this.dataPath, "utf-8");
      this.data = JSON.parse(content);
      log(`✅ 데이터 로드 성공: ${this.dataPath}`, "green");
      return true;
    } catch (error) {
      log(`❌ 데이터 로드 실패: ${error.message}`, "red");
      return false;
    }
  }

  // 1. 전체 스킬 수 검증
  validateTotalSkills() {
    header("1️⃣ 전체 스킬 수 검증");

    const totalSkills = this.data.length;
    const minRequired = 120;

    log(
      `총 스킬 수: ${totalSkills}개`,
      totalSkills >= minRequired ? "green" : "red",
    );

    if (totalSkills >= minRequired) {
      log(`✅ 목표 달성 (목표: ${minRequired}개 이상)`, "green");
    } else {
      log(`⚠️ 부족: ${minRequired - totalSkills}개 더 필요`, "yellow");
      this.warnings.push(`스킬 수 부족: ${totalSkills}/${minRequired}`);
    }

    return totalSkills;
  }

  // 2. 도메인별 분포 검증
  validateDomainDistribution() {
    header("2️⃣ 도메인별 분포 검증");

    const expectedDomains = [
      "industrial-robot-control",
      "machine-vision-sensor",
      "collaborative-robot",
      "autonomous-mobile-robot",
      "robot-maintenance-diagnostics",
      "digital-twin-simulation",
      "agentic-ai-manufacturing",
    ];

    const domainStats = {};
    this.data.forEach((skill) => {
      if (!domainStats[skill.domain]) {
        domainStats[skill.domain] = 0;
      }
      domainStats[skill.domain]++;
    });

    const foundDomains = Object.keys(domainStats);
    const missingDomains = expectedDomains.filter(
      (d) => !foundDomains.includes(d),
    );

    // 도메인별 상세 정보
    const table = [];
    expectedDomains.forEach((domain) => {
      const count = domainStats[domain] || 0;
      const status = count > 0 ? "✅" : "❌";
      table.push({
        Domain: status,
        Name: domain,
        Count: count,
      });
    });

    console.table(table);

    if (missingDomains.length === 0) {
      log(`✅ 모든 6개 도메인이 존재합니다.`, "green");
    } else {
      log(`❌ 누락된 도메인: ${missingDomains.join(", ")}`, "red");
      this.errors.push(`누락된 도메인: ${missingDomains.join(", ")}`);
    }

    return domainStats;
  }

  // 3. skill_type별 분포 검증
  validateSkillTypeDistribution() {
    header("3️⃣ 스킬 타입별 분포 검증");

    const typeStats = {};
    this.data.forEach((skill) => {
      const type = skill.skill_type;
      if (!typeStats[type]) {
        typeStats[type] = 0;
      }
      typeStats[type]++;
    });

    const total = this.data.length;
    const table = [];

    Object.entries(typeStats).forEach(([type, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      table.push({
        Type: type,
        Count: count,
        Percentage: `${percentage}%`,
      });
    });

    console.table(table);

    // 3층 모두 존재하는지 확인
    const expectedTypes = ["knowledge", "skill", "competence"];
    const foundTypes = Object.keys(typeStats);
    const allPresent = expectedTypes.every((t) => foundTypes.includes(t));

    if (allPresent) {
      log(`✅ 3층 계층 구조 모두 존재 (Knowledge, Skill, Competence)`, "green");
    } else {
      const missing = expectedTypes.filter((t) => !foundTypes.includes(t));
      log(`❌ 누락된 스킬 타입: ${missing.join(", ")}`, "red");
      this.errors.push(`누락된 스킬 타입: ${missing.join(", ")}`);
    }

    return typeStats;
  }

  // 4. role_mapping 커버리지 검증
  validateRoleMapping() {
    header("4️⃣ 역할 커버리지 검증");

    const roleStats = {};
    const expectedRoles = ["operator", "engineer", "developer"];

    this.data.forEach((skill) => {
      skill.role_mapping.forEach((role) => {
        if (!roleStats[role]) {
          roleStats[role] = 0;
        }
        roleStats[role]++;
      });
    });

    const table = [];
    expectedRoles.forEach((role) => {
      const count = roleStats[role] || 0;
      const status = count > 0 ? "✅" : "❌";
      table.push({
        Role: status,
        Name: role,
        Count: count,
      });
    });

    console.table(table);

    // 모든 역할이 커버되는지 확인
    const allCovered = expectedRoles.every(
      (r) => roleStats[r] && roleStats[r] > 0,
    );

    if (allCovered) {
      log(`✅ 3개 역할 모두 커버됨`, "green");
    } else {
      const missing = expectedRoles.filter(
        (r) => !roleStats[r] || roleStats[r] === 0,
      );
      log(`❌ 누락된 역할: ${missing.join(", ")}`, "red");
      this.errors.push(`누락된 역할: ${missing.join(", ")}`);
    }

    return roleStats;
  }

  // 5. 고아 스킬 탐지
  validateOrphanSkills() {
    header("5️⃣ 고아 스킬 탐지 (parent_skill_id 검증)");

    const skillIds = new Set(this.data.map((s) => s.skill_id));
    const orphans = [];

    this.data.forEach((skill) => {
      if (skill.parent_skill_id && !skillIds.has(skill.parent_skill_id)) {
        orphans.push({
          skill_id: skill.skill_id,
          parent_id: skill.parent_skill_id,
          label: skill.preferred_label_ko,
        });
      }
    });

    if (orphans.length === 0) {
      log(`✅ 고아 스킬 없음 (모든 parent_skill_id가 유효함)`, "green");
    } else {
      log(`⚠️ 고아 스킬 발견: ${orphans.length}개`, "yellow");
      console.table(orphans);
      this.warnings.push(`고아 스킬: ${orphans.length}개`);
    }

    return orphans;
  }

  // 6. related_skills 상호참조 검증
  validateRelatedSkills() {
    header("6️⃣ related_skills 상호참조 검증");

    const skillIds = new Set(this.data.map((s) => s.skill_id));
    const invalidReferences = [];

    this.data.forEach((skill) => {
      if (skill.related_skills && Array.isArray(skill.related_skills)) {
        skill.related_skills.forEach((relation) => {
          const relatedId = getRelationTarget(relation);
          if (!skillIds.has(relatedId)) {
            invalidReferences.push({
              skill_id: skill.skill_id,
              invalid_reference: relatedId,
            });
          }
        });
      }
    });

    if (invalidReferences.length === 0) {
      log(`✅ 모든 related_skills 참조가 유효함`, "green");
    } else {
      log(
        `⚠️ 유효하지 않은 참조 발견: ${invalidReferences.length}개`,
        "yellow",
      );
      console.table(invalidReferences);
      this.warnings.push(`유효하지 않은 참조: ${invalidReferences.length}개`);
    }

    return invalidReferences;
  }

  // 9. strict 모드: 온톨로지의 의미적 무결성 검증
  validateOntologySemantics() {
    header("9️⃣ 온톨로지 의미 검증 (strict)");
    const result = validateOntologySemantics(this.data);

    console.table(result.metrics);
    result.errors.forEach((error) => this.errors.push(error));
    result.warnings.forEach((warning) => this.warnings.push(warning));

    if (result.valid) {
      log("✅ 온톨로지 의미 검증 통과", "green");
    } else {
      log(`❌ 온톨로지 의미 오류: ${result.errors.length}개`, "red");
    }

    return result;
  }

  // 10. strict 모드: 조직 역량과 기준 온톨로지 연결 검증
  validateOrganizationMappings() {
    header("🔟 조직 역량 매핑 검증 (strict)");
    const organizationsDir = path.join(
      __dirname,
      "../public/data/organizations",
    );
    const files = fs
      .readdirSync(organizationsDir)
      .filter((file) => file.endsWith(".json"));
    const metrics = { skills: 0, mapped: 0, unmapped: 0 };

    files.forEach((file) => {
      const organization = JSON.parse(
        fs.readFileSync(path.join(organizationsDir, file), "utf-8"),
      );
      const result = validateOrganizationMapping(organization, this.data);
      result.errors.forEach((error) => this.errors.push(`${file}: ${error}`));
      result.warnings.forEach((warning) =>
        this.warnings.push(`${file}: ${warning}`),
      );
      metrics.skills += result.metrics.skills;
      metrics.mapped += result.metrics.mapped;
      metrics.unmapped += result.metrics.unmapped;
    });

    metrics.coverage =
      metrics.skills === 0
        ? 0
        : Number(((metrics.mapped / metrics.skills) * 100).toFixed(1));
    console.table(metrics);
    log("✅ 조직 역량 매핑 검증 완료", "green");
    return metrics;
  }

  // 11. strict 모드: 칼리지 매핑(4대 도메인) 검증
  validateCollegeMappings() {
    header("1️⃣1️⃣ 칼리지 매핑 검증 (strict)");
    const mappingPath = path.join(
      __dirname,
      "../public/data/college-mapping.json",
    );
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
    const { resolveSkillCollege, validateCollegeMappingData } =
      loadCollegeResolver();

    const knownSkillIds = new Set(this.data.map((skill) => skill.skill_id));
    const errors = validateCollegeMappingData(mappingData, knownSkillIds);

    const mappedDomains = new Set(Object.keys(mappingData.domainMapping));
    this.data.forEach((skill) => {
      if (!mappedDomains.has(skill.domain)) {
        errors.push(`${skill.skill_id}: 칼리지 매핑 없는 도메인 '${skill.domain}'`);
      }
    });

    // 중간분류: 모든 스킬이 자기 칼리지의 중간분류에 정확히 1개 배정돼야 한다.
    const subcategoryPath = path.join(
      __dirname,
      "../public/data/college-subcategories.json",
    );
    const subcategoryData = JSON.parse(
      fs.readFileSync(subcategoryPath, "utf-8"),
    );
    const collegeIds = new Set(
      mappingData.colleges.map((college) => college.id),
    );
    const subcategoriesById = new Map(
      subcategoryData.subcategories.map((subcategory) => [
        subcategory.id,
        subcategory,
      ]),
    );
    subcategoryData.subcategories.forEach((subcategory) => {
      if (!collegeIds.has(subcategory.collegeId)) {
        errors.push(
          `중간분류 ${subcategory.id}: 존재하지 않는 collegeId '${subcategory.collegeId}'`,
        );
      }
    });
    Object.keys(subcategoryData.skillSubcategories).forEach((skillId) => {
      if (!knownSkillIds.has(skillId)) {
        errors.push(`중간분류 배정 ${skillId}: 존재하지 않는 스킬입니다.`);
      }
    });
    this.data.forEach((skill) => {
      const subcategoryId = subcategoryData.skillSubcategories[skill.skill_id];
      if (!subcategoryId) {
        errors.push(`${skill.skill_id}: 중간분류가 배정되지 않았습니다.`);
        return;
      }
      const subcategory = subcategoriesById.get(subcategoryId);
      if (!subcategory) {
        errors.push(
          `${skill.skill_id}: 존재하지 않는 중간분류 '${subcategoryId}'`,
        );
        return;
      }
      const resolution = resolveSkillCollege(
        skill,
        mappingData.domainMapping,
        mappingData.skillOverrides,
      );
      if (resolution && subcategory.collegeId !== resolution.primary) {
        errors.push(
          `${skill.skill_id}: 중간분류 '${subcategoryId}'(${subcategory.collegeId})가 ` +
            `칼리지 배정(${resolution.primary})과 다릅니다.`,
        );
      }
    });

    const overrides = Object.entries(mappingData.skillOverrides ?? {});
    const metrics = {
      domains: mappedDomains.size,
      overrides: overrides.length,
      proposed: overrides.filter(([, o]) => o.source === "proposed").length,
      reviewed: overrides.filter(([, o]) => o.source === "reviewed").length,
      subcategories: subcategoryData.subcategories.length,
    };
    console.table(metrics);

    errors.forEach((error) => this.errors.push(`college-mapping: ${error}`));
    if (errors.length === 0) {
      log("✅ 칼리지 매핑 검증 통과", "green");
    } else {
      log(`❌ 칼리지 매핑 오류: ${errors.length}개`, "red");
      errors.forEach((error) => log(`   - ${error}`, "red"));
    }

    return metrics;
  }

  // 7. 추가 통계: proficiency_level 분포
  validateProficiencyDistribution() {
    header("7️⃣ 숙련도 레벨 분포 검증");

    const profStats = {};
    this.data.forEach((skill) => {
      const level = skill.proficiency_level;
      if (!profStats[level]) {
        profStats[level] = 0;
      }
      profStats[level]++;
    });

    const table = [];
    for (let level = 1; level <= 4; level++) {
      const count = profStats[level] || 0;
      const percentage = ((count / this.data.length) * 100).toFixed(1);
      table.push({
        Level: level,
        Count: count,
        Percentage: `${percentage}%`,
      });
    }

    console.table(table);

    // 모든 레벨이 표현되는지 확인
    const allLevels = [1, 2, 3, 4].every(
      (l) => profStats[l] && profStats[l] > 0,
    );
    if (allLevels) {
      log(`✅ 4개 레벨 모두 표현됨`, "green");
    } else {
      log(`⚠️ 누락된 레벨이 있습니다.`, "yellow");
    }

    return profStats;
  }

  // 8. 필드 완성도 검증
  validateFieldCompleteness() {
    header("8️⃣ 필드 완성도 검증");

    const requiredFields = [
      "skill_id",
      "domain",
      "preferred_label_ko",
      "preferred_label_en",
      "skill_type",
      "proficiency_level",
      "role_mapping",
    ];

    let incompleteCount = 0;

    this.data.forEach((skill) => {
      requiredFields.forEach((field) => {
        if (
          !skill[field] ||
          skill[field] === "" ||
          (Array.isArray(skill[field]) && skill[field].length === 0)
        ) {
          incompleteCount++;
          this.errors.push(`스킬 ${skill.skill_id}: 필수 필드 '${field}' 누락`);
        }
      });
    });

    if (incompleteCount === 0) {
      log(`✅ 모든 스킬의 필수 필드가 완성됨`, "green");
    } else {
      log(`❌ 불완전한 필드: ${incompleteCount}개`, "red");
    }

    return incompleteCount === 0;
  }

  // 최종 리포트
  generateReport() {
    header("📋 최종 검증 리포트");

    console.log("\n");
    if (this.errors.length === 0) {
      log("🎉 검증 완료: 모든 검증에 통과했습니다!", "green");
    } else {
      log(`❌ 발견된 오류: ${this.errors.length}개`, "red");
      this.errors.forEach((error) => log(`   - ${error}`, "red"));
    }

    if (this.warnings.length > 0) {
      log(`\n⚠️ 경고: ${this.warnings.length}개`, "yellow");
      this.warnings.forEach((warning) => log(`   - ${warning}`, "yellow"));
    }

    console.log("\n" + "=".repeat(60));
  }

  run() {
    if (!this.load()) {
      return false;
    }

    const totalSkills = this.validateTotalSkills();
    const domainStats = this.validateDomainDistribution();
    const typeStats = this.validateSkillTypeDistribution();
    const roleStats = this.validateRoleMapping();
    const orphans = this.validateOrphanSkills();
    const invalidReferences = this.validateRelatedSkills();
    const profStats = this.validateProficiencyDistribution();
    const fieldsComplete = this.validateFieldCompleteness();
    const ontologyResult = this.strict
      ? this.validateOntologySemantics()
      : null;
    const organizationMetrics = this.strict
      ? this.validateOrganizationMappings()
      : null;
    const collegeMetrics = this.strict ? this.validateCollegeMappings() : null;

    // 최종 요약 테이블
    header("📊 최종 요약");
    const summary = [
      { Metric: "총 스킬 수", Value: totalSkills },
      { Metric: "도메인 수", Value: Object.keys(domainStats).length },
      { Metric: "Knowledge 스킬", Value: typeStats.knowledge || 0 },
      { Metric: "Skill 스킬", Value: typeStats.skill || 0 },
      { Metric: "Competence 스킬", Value: typeStats.competence || 0 },
      { Metric: "고아 스킬", Value: orphans.length },
      { Metric: "유효하지 않은 참조", Value: invalidReferences.length },
      ...(ontologyResult
        ? [
            { Metric: "관계 엣지", Value: ontologyResult.metrics.edges },
            { Metric: "고립 노드", Value: ontologyResult.metrics.isolated },
          ]
        : []),
      ...(organizationMetrics
        ? [
            { Metric: "조직 역량", Value: organizationMetrics.skills },
            { Metric: "기준 스킬 연결", Value: organizationMetrics.mapped },
            { Metric: "조직 고유 역량", Value: organizationMetrics.unmapped },
          ]
        : []),
      ...(collegeMetrics
        ? [
            { Metric: "칼리지 스킬 오버라이드", Value: collegeMetrics.overrides },
            { Metric: "오버라이드 검수 완료", Value: collegeMetrics.reviewed },
          ]
        : []),
    ];
    console.table(summary);

    this.generateReport();

    return this.errors.length === 0;
  }
}

// ==================== 메인 실행 ====================
const strict = process.argv.includes("--strict");
const dataArgumentIndex = process.argv.indexOf("--data");
const dataPath =
  dataArgumentIndex >= 0
    ? path.resolve(process.argv[dataArgumentIndex + 1])
    : path.join(__dirname, "../public/data/robot-smartfactory.json");
const validator = new RobotDataValidator(dataPath, { strict });
const success = validator.run();

process.exit(success ? 0 : 1);
