import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KAPI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "kapi.mjs");

function run(input, env = {}) {
  const r = spawnSync(process.execPath, [KAPI], { input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout.trim() };
}

function transcript(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kanit-"));
  const file = path.join(dir, "t.jsonl");
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n{yarım satır");
  return file;
}

const user = (text) => ({ type: "user", message: { content: text } });
const tool = (id, name, input) => ({ type: "assistant", message: { content: [{ type: "tool_use", id, name, input }] } });

test("kontrolsüz 'bitti' engellenir, JSON block döner", () => {
  const t = transcript([user("butonu düzelt"), tool("a", "Edit", { file_path: "src/Button.tsx" })]);
  const r = run({ transcript_path: t, last_assistant_message: "Butonu düzelttim.", stop_hook_active: false });
  assert.equal(r.code, 0);
  const out = JSON.parse(r.out);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /src\/Button\.tsx/);
  assert.match(out.reason, /doğrulanmadı/);
});

test("kontrol çalıştıysa sessiz geçer", () => {
  const t = transcript([user("düzelt"), tool("a", "Edit", { file_path: "a.js" }), tool("b", "Bash", { command: "npm test" })]);
  assert.equal(run({ transcript_path: t, last_assistant_message: "Düzelttim, testler geçti." }).out, "");
});

test("last_assistant_message yoksa transcript'teki son metne düşer", () => {
  const t = transcript([
    user("düzelt"),
    tool("a", "Edit", { file_path: "a.js" }),
    { type: "assistant", message: { content: [{ type: "text", text: "Tamamlandı." }] } },
  ]);
  assert.equal(JSON.parse(run({ transcript_path: t }).out).decision, "block");
});

test("bozuk girdi, eksik transcript, kapalı anahtar: asla engellemez", () => {
  const bad = spawnSync(process.execPath, [KAPI], { input: "{bozuk", encoding: "utf8" });
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, "");
  assert.equal(run({ transcript_path: "yok.jsonl", last_assistant_message: "Bitti." }).out, "");
  const t = transcript([user("x"), tool("a", "Write", { file_path: "a.md" })]);
  assert.equal(run({ transcript_path: t, last_assistant_message: "Bitti." }, { KANIT_KAPALI: "1" }).out, "");
});
