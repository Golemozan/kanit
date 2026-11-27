import { test } from "node:test";
import assert from "node:assert/strict";
import { isClaim, isHonest, isCheck, turnTools, decide } from "../hooks/kural.mjs";

const edit = (f = "app.js") => ({ name: "Edit", input: { file_path: f } });
const sh = (command, name = "Bash") => ({ name, input: { command } });

test("bitti iddiası: Türkçe ve İngilizce, ekli halleri", () => {
  for (const t of ["Düzelttim, artık çalışıyor.", "Tamamlandı.", "Butonu ekledim", "Hallettik!", "Fixed the bug.", "All set.", "İşlem tamamdır"]) {
    assert.equal(isClaim(t), true, t);
  }
  for (const t of ["Sence hangisi daha iyi?", "Dosyayı okudum, üç seçenek var.", "Neden böyle oluyor bakalım."]) {
    assert.equal(isClaim(t), false, t);
  }
});

test("kelime içinde geçen kök iddia sayılmaz", () => {
  assert.equal(isClaim("bittiğinde haber ver"), false);
  assert.equal(isClaim("hazırlık aşamasındayım"), false);
});

test("dürüst kaçış", () => {
  assert.equal(isHonest("Kodu ekledim ama doğrulanmadı: test ortamı yok."), true);
  assert.equal(isHonest("Implemented, not verified yet."), true);
  assert.equal(isHonest("Ekledim ve testler geçti."), false);
});

test("kontrol sayılan araçlar", () => {
  assert.equal(isCheck(sh("npm test")), true);
  assert.equal(isCheck(sh("pytest -q")), true);
  assert.equal(isCheck(sh("curl -s localhost:3000/api")), true);
  assert.equal(isCheck(sh("dotnet build", "PowerShell")), true);
  assert.equal(isCheck({ name: "mcp__Claude_Browser__computer", input: { action: "screenshot" } }), true);
  assert.equal(isCheck(sh("git status")), false);
  assert.equal(isCheck(sh("ls -la")), false);
  assert.equal(isCheck({ name: "Read", input: { file_path: "app.js" } }), false);
});

test("ek kontrol kalıbı ortam değişkeniyle", () => {
  process.env.KANIT_EK_KONTROL = "\\bjust check\\b";
  assert.equal(isCheck(sh("just check")), true);
  delete process.env.KANIT_EK_KONTROL;
  assert.equal(isCheck(sh("just check")), false);
});

test("karar: düzenleme var, kontrol yok, bitti dendi → engelle", () => {
  const r = decide({ message: "Düzelttim.", tools: [edit("a.js"), sh("git diff")], stopHookActive: false });
  assert.equal(r.block, true);
  assert.deepEqual(r.files, ["a.js"]);
});

test("karar: kontrol son düzenlemeden ÖNCE çalıştıysa yine engelle", () => {
  const r = decide({ message: "Fixed.", tools: [sh("npm test"), edit()], stopHookActive: false });
  assert.equal(r.block, true);
});

test("karar: son düzenlemeden sonra kontrol → geç", () => {
  const r = decide({ message: "Düzelttim, testler geçti.", tools: [edit(), sh("npm test")], stopHookActive: false });
  assert.equal(r.block, false);
});

test("karar: düzenleme yoksa, iddia yoksa, dürüstse ya da kapı zaten çalıştıysa geç", () => {
  assert.equal(decide({ message: "Bitti.", tools: [sh("ls")], stopHookActive: false }).block, false);
  assert.equal(decide({ message: "Şunu mu yapalım?", tools: [edit()], stopHookActive: false }).block, false);
  assert.equal(decide({ message: "Ekledim, doğrulanmadı.", tools: [edit()], stopHookActive: false }).block, false);
  assert.equal(decide({ message: "Bitti.", tools: [edit()], stopHookActive: true }).block, false);
});

test("tur sınırı: yalnız son gerçek kullanıcı mesajından sonrası sayılır", () => {
  const entries = [
    { type: "user", message: { content: "ilk istek" } },
    { type: "assistant", message: { content: [{ type: "tool_use", id: "1", name: "Edit", input: { file_path: "eski.js" } }] } },
    { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "1" }] } },
    { type: "user", message: { content: "ikinci istek" } },
    { type: "user", isMeta: true, message: { content: [{ type: "text", text: "skill yüklendi" }] } },
    { type: "assistant", message: { content: [{ type: "tool_use", id: "2", name: "Bash", input: { command: "npm test" } }] } },
    { type: "assistant", isSidechain: true, message: { content: [{ type: "tool_use", id: "3", name: "Edit", input: {} }] } },
    { type: "assistant", message: { content: [{ type: "tool_use", id: "2", name: "Bash", input: { command: "npm test" } }] } },
  ];
  assert.deepEqual(turnTools(entries).map((t) => t.name), ["Bash"]);
});
