#!/usr/bin/env node
// 평가자 접속 코드의 codeHash 를 생성한다.
// 사용법: node scripts/generate-evaluator-code-hash.js --id EVAL-005 --code "접속코드"
// 출력된 codeHash 를 public/data/evaluators.json 의 해당 평가자에 넣는다.
// 접속 코드 평문은 저장소에 커밋하지 않는다.

const crypto = require("node:crypto");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--id") {
      args.id = argv[i + 1];
      i += 1;
    } else if (token === "--code") {
      args.code = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const { id, code } = parseArgs(process.argv.slice(2));

if (!id || !code) {
  console.error(
    '사용법: node scripts/generate-evaluator-code-hash.js --id EVAL-005 --code "접속코드"',
  );
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(`${id}:${code}`).digest("hex");
console.log(`id:       ${id}`);
console.log(`codeHash: ${hash}`);
