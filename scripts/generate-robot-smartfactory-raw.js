const fs = require("fs");
const path = require("path");

const dataPath = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "robot-smartfactory.json",
);
const outputDir = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "robot-smartfactory",
  "skills",
);

function loadData() {
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("robot-smartfactory.json must be an array");
  }
  return data;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeSkillFiles(skills) {
  ensureDir(outputDir);

  skills.forEach((skill) => {
    if (!skill || !skill.skill_id) {
      throw new Error("Skill missing skill_id");
    }
    const filePath = path.join(outputDir, `${skill.skill_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), "utf-8");
  });
}

function main() {
  const skills = loadData();
  writeSkillFiles(skills);
  console.log(`Generated ${skills.length} raw skill files in ${outputDir}`);
}

main();
