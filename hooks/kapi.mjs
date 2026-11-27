#!/usr/bin/env node
// kanıt — Stop kapısı. Claude Code her durmak istediğinde çalışır.
// Son mesajda "bitti" iddiası var, bu turda dosya değişmiş ve son değişiklikten sonra
// hiçbir kontrol çalışmamışsa durmayı engeller ve kontrolü ister. Diğer her durumda sessiz geçer.
// Bir şey bozulursa (okunamayan girdi, eksik transcript) asla engellemez.

import fs from "node:fs";
import { decide, reason, turnTools } from "./kural.mjs";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function readTranscript(file) {
  if (!file || !fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* yarım satır: transcript eşzamansız yazılıyor */
    }
  }
  return out;
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    return;
  }
  if (process.env.KANIT_KAPALI === "1") return;

  const entries = readTranscript(input.transcript_path);
  const message = input.last_assistant_message ?? lastText(entries);
  const result = decide({ message, tools: turnTools(entries), stopHookActive: !!input.stop_hook_active });
  if (result.block) {
    process.stdout.write(JSON.stringify({ decision: "block", reason: reason(result.files) }));
  }
}

// Eski sürümlerde last_assistant_message yok: transcript'teki son asistan metnine düş.
function lastText(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type !== "assistant" || e.isSidechain) continue;
    const t = (e.message?.content || []).filter((x) => x.type === "text").map((x) => x.text).join("\n");
    if (t) return t;
  }
  return "";
}

try {
  main();
} catch {
  // Kapı hiçbir zaman kendi hatasıyla kullanıcıyı kilitlemez.
}
