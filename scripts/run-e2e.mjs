import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const backend = resolve(process.env.CONSULTCARE_BACKEND_PATH || "../ConsultCare-BackEnd");
const localPython = resolve(backend, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
const python = process.env.CONSULTCARE_PYTHON || (existsSync(localPython) ? localPython : process.platform === "win32" ? "python" : "python3");
const result = spawnSync(python, [resolve(backend, "tests/run_e2e.py"), process.cwd()], { cwd: backend, stdio: "inherit", env: process.env });
if (result.error) { console.error("Could not start full-stack tests:", result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
