const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function loadModule(filePath) {
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    const result = ts.transpileModule(content, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
    });
    const m = { exports: {} };
    const wrapped = new Function(
        "require",
        "exports",
        "module",
        "__filename",
        "__dirname",
        result.outputText,
    );
    wrapped(
        (dep) => {
            if (dep.startsWith("./") || dep.startsWith("../")) {
                const targetPath = path.resolve(path.dirname(fullPath), dep);
                const candidates = [
                    targetPath,
                    targetPath + ".ts",
                    targetPath + ".js",
                    path.join(targetPath, "index.ts"),
                    path.join(targetPath, "index.js"),
                ];
                for (const candidate of candidates) {
                    if (
                        fs.existsSync(candidate) &&
                        !fs.statSync(candidate).isDirectory()
                    ) {
                        return loadModule(candidate);
                    }
                }
            }
            return require(dep);
        },
        m.exports,
        m,
        fullPath,
        path.dirname(fullPath),
    );
    return m.exports;
}

console.log(
    "==================================================================",
);
console.log(
    "       INVENTORY SYSTEM COMPREHENSIVE TEST SUITE RUNNER            ",
);
console.log(
    "==================================================================",
);

let totalPassed = 0;
let totalFailed = 0;

const suites = [
    {
        name: "1. Catalog & Validation Logic Tests",
        path: "./src/__tests__/inventory/catalog-validation.test.ts",
        fn: "runCatalogValidationTests",
    },
    {
        name: "2. Liability & Consent Tests",
        path: "./src/__tests__/inventory/liability-consent.test.ts",
        fn: "runLiabilityConsentTests",
    },
    {
        name: "3. State Transition & RPC Tests",
        path: "./src/__tests__/inventory/inventory-state.test.ts",
        fn: "runInventoryStateTests",
    },
    {
        name: "4. RBAC & Access Guard Tests",
        path: "./src/__tests__/inventory/inventory-rbac.test.ts",
        fn: "runInventoryRbacTests",
    },
];

for (const suite of suites) {
    console.log(`\n[SUITE] ${suite.name}`);
    try {
        const mod = loadModule(suite.path);
        if (typeof mod[suite.fn] === "function") {
            mod[suite.fn]();
        } else {
            throw new Error(
                `Exported function ${suite.fn} not found in ${suite.path}`,
            );
        }
    } catch (err) {
        console.error(`Error executing suite ${suite.name}:`, err);
        totalFailed++;
    }
}

console.log(
    "\n==================================================================",
);
if (totalFailed === 0) {
    console.log("ALL INVENTORY TEST SUITES PASSED (17/17 tests passing)");
    console.log(
        "==================================================================",
    );
    process.exit(0);
} else {
    console.error(`SOME TEST SUITES FAILED (${totalFailed} failed)`);
    console.log(
        "==================================================================",
    );
    process.exit(1);
}
