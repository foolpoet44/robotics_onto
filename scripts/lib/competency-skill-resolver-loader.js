// app/lib/competency-skill-resolver.ts 를 스크립트에서 재사용하기 위한 로더.
// TS 원본을 단일 진실 원천으로 유지해 해석 로직의 이중 구현을 막는다.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const resolverPath = path.join(
  __dirname,
  "../../app/lib/competency-skill-resolver.ts",
);

function loadCompetencySkillResolver() {
  const source = fs.readFileSync(resolverPath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const exportsObject = {};
  const sandbox = {
    exports: exportsObject,
    require,
    module: { exports: exportsObject },
  };

  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: resolverPath,
  });

  return sandbox.module.exports;
}

module.exports = { loadCompetencySkillResolver };
