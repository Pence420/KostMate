import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const win = process.platform === "win32";
const venv = path.join(
  root,
  ".venv",
  win ? "Scripts/python.exe" : "bin/python",
);
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    shell: win && command === "npm",
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `Perintah gagal: ${command} ${args.join(" ")}. Baca pesan di atas, perbaiki, lalu coba lagi.`,
    );
}
function python() {
  for (const [command, args] of [
    ["python3", []],
    ["python", []],
    ...(win ? [["py", ["-3"]]] : []),
  ]) {
    const result = spawnSync(command, [
      ...args,
      "-c",
      "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)",
    ]);
    if (!result.error && result.status === 0) return [command, args];
  }
  throw new Error(
    "Python 3.11 atau lebih baru belum ditemukan. Install Python, centang Add Python to PATH di Windows, lalu buka ulang terminal.",
  );
}
function ready() {
  if (!existsSync(venv) || !existsSync("frontend/node_modules"))
    throw new Error("Persiapan belum lengkap. Jalankan npm run setup dulu.");
}
function build() {
  run("npm", ["--prefix", "frontend", "run", "build"]);
}
try {
  const action = process.argv[2];
  if (action === "setup") {
    if (Number(process.versions.node.split(".")[0]) < 22)
      throw new Error("Gunakan Node.js 22.12+ atau Node.js 24 LTS.");
    const [command, args] = python();
    console.log("\n[1/4] Menyiapkan Python lokal…");
    run(command, [...args, "-m", "venv", ".venv"]);
    console.log("\n[2/4] Memasang kebutuhan backend…");
    run(venv, ["-m", "pip", "install", "-r", "backend/requirements.lock.txt"]);
    console.log("\n[3/4] Memasang kebutuhan tampilan…");
    run("npm", ["ci", "--prefix", "frontend"]);
    console.log("\n[4/4] Membuat tampilan siap demo…");
    build();
    console.log(
      "\nSIAP! Ketik npm start. Data contoh dan akun demo dibuat otomatis saat server mulai.",
    );
  } else if (action === "test" || action === "check") {
    ready();
    run(venv, ["-m", "pytest", "backend/tests", "-q"]);
    if (action === "check") {
      build();
      run(venv, ["scripts/smoke.py"]);
    }
  } else if (action === "start" || action === "backend") {
    ready();
    if (action === "start") build();
    const portIndex = process.argv.indexOf("--port");
    const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 8000;
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error(
        "Port harus angka 1024–65535. Contoh: npm start -- --port 8001",
      );
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", () =>
        reject(
          new Error(
            `Port ${port} sudah dipakai. Tutup server lama dengan Ctrl+C, atau jalankan npm start -- --port ${port + 1}`,
          ),
        ),
      );
      probe.listen(port, "127.0.0.1", () => probe.close(resolve));
    });
    console.log(
      `\nBuka http://127.0.0.1:${port} di browser. Biarkan terminal ini terbuka. Tekan Ctrl+C untuk berhenti.\n`,
    );
    const child = spawn(
      venv,
      [
        "-m",
        "uvicorn",
        "backend.app:app",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        ...(action === "backend" ? ["--reload"] : []),
      ],
      { stdio: "inherit" },
    );
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
    child.on("error", (error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 0;
    });
  } else
    throw new Error(
      "Gunakan npm run setup, npm start, npm test, atau npm run check.",
    );
} catch (error) {
  console.error("\nKostMate: " + error.message);
  process.exitCode = 1;
}
