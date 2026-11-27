// kanıt — "bitti" iddiasını ve turdaki araç kullanımını değerlendiren saf kurallar.
// DOM, ağ, dosya yok: kapi.mjs okur, bu dosya karar verir. Testler bunu doğrudan çağırır.

const H = "A-Za-zÇĞİÖŞÜçğıöşü"; // harf sınıfı: \b Türkçe harfleri tanımıyor
const word = (p) => new RegExp(`(?<![${H}])(?:${p})(?![${H}])`, "i");

// Bitti iddiası. Ek alabilen kökler kökten yakalanır ("düzelttim", "düzelttik").
const CLAIMS = [
  "bitti", "bitirdim", "bitirdik", "tamamland[ıi]", "tamamlad[ıi]m", "tamamlad[ıi]k", "tamamd[ıi]r",
  "hallettim", "hallettik", "halloldu", "çözdüm", "çözdük", "çözüldü",
  "düzelttim", "düzelttik", "düzeltildi", "düzeldi", "giderildi", "giderdim",
  "ekledim", "ekledik", "eklendi", "yapt[ıi]m", "yapt[ıi]k", "yap[ıi]ld[ıi]",
  "güncelledim", "güncelledik", "güncellendi", "uygulad[ıi]m", "uyguland[ıi]",
  "çal[ıi]ş[ıi]yor", "haz[ıi]r", "teslim",
  "done", "fixed", "completed?", "implemented", "resolved", "works", "working now", "all set", "ready",
];
const CLAIM_RE = word(CLAIMS.join("|"));

// Dürüst kaçış: ajan doğrulayamadığını açıkça söylüyorsa engellenmez.
const HONEST_RE = word(
  [
    "doğrulanmad[ıi]", "doğrulamad[ıi]m", "doğrulayamad[ıi]m", "test edilmedi", "test etmedim", "test edemedim",
    "denemedim", "deneyemedim", "denenmedi", "kontrol edilmedi", "kontrol edemedim", "çal[ıi]şt[ıi]rmad[ıi]m",
    "not (?:yet )?(?:verified|tested)", "unverified", "untested", "could ?n[o']t (?:verify|test|run)", "did ?n[o']t (?:verify|test|run)",
  ].join("|")
);

export const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

// Kabuktan çalıştırılan ve bir şeyin gerçekten çalıştığını gösteren komutlar.
const CHECK_CMD = new RegExp(
  [
    "\\btest\\b", "\\btests\\b", "pytest", "jest", "vitest", "mocha", "phpunit", "rspec",
    "\\bnpm (?:run|test|t)\\b", "\\bpnpm\\b", "\\byarn\\b", "\\bbun (?:test|run)\\b", "\\bnpx\\b",
    "\\bnode\\b", "\\bdeno\\b", "\\bpython3?\\b", "\\bpy -", "\\bgo (?:test|run|build|vet)\\b",
    "\\bcargo (?:test|run|build|check|clippy)\\b", "\\bdotnet (?:test|run|build)\\b", "\\bmvn\\b", "\\bgradlew?\\b",
    "\\bmake\\b", "\\btsc\\b", "\\beslint\\b", "\\bruff\\b", "\\bmypy\\b", "\\bclippy\\b",
    "\\bcurl\\b", "\\bwget\\b", "Invoke-WebRequest", "Invoke-RestMethod", "\\bplaywright\\b", "\\bcypress\\b",
    "--screenshot", "\\bffprobe\\b", "\\bhyperframes\\b", "\\bdocker (?:run|compose)\\b",
  ].join("|"),
  "i"
);
// Ekranı/sayfayı gerçekten gören araçlar (tarayıcı, ekran görüntüsü, önizleme).
const CHECK_TOOL = /screenshot|navigate|read_page|get_page_text|preview_|javascript|browser_batch|computer/i;

export function isClaim(text) {
  return CLAIM_RE.test(text || "");
}

export function isHonest(text) {
  return HONEST_RE.test(text || "");
}

export function isCheck(tool) {
  if (SHELL_TOOLS.has(tool.name)) {
    const extra = process.env.KANIT_EK_KONTROL;
    const cmd = String(tool.input?.command || "");
    return CHECK_CMD.test(cmd) || (extra ? new RegExp(extra, "i").test(cmd) : false);
  }
  return CHECK_TOOL.test(tool.name);
}

// Transcript satırlarından son gerçek kullanıcı mesajından sonraki araç çağrılarını sırayla çıkar.
export function turnTools(entries) {
  let start = 0;
  entries.forEach((e, i) => {
    if (e.type !== "user" || e.isMeta || e.isSidechain) return;
    const c = e.message?.content;
    const human = typeof c === "string" || (Array.isArray(c) && c.some((x) => x.type === "text"));
    if (human) start = i + 1;
  });
  const tools = [];
  const seen = new Set();
  for (const e of entries.slice(start)) {
    if (e.type !== "assistant" || e.isSidechain) continue;
    for (const x of e.message?.content || []) {
      if (x.type !== "tool_use" || seen.has(x.id)) continue;
      seen.add(x.id);
      tools.push({ name: x.name, input: x.input || {} });
    }
  }
  return tools;
}

// Karar: { block: bool, why: string }
export function decide({ message, tools, stopHookActive }) {
  if (stopHookActive) return { block: false, why: "kapı zaten bir kez durdurdu" };
  if (!isClaim(message)) return { block: false, why: "bitti iddiası yok" };
  if (isHonest(message)) return { block: false, why: "doğrulanmadığı açıkça söylenmiş" };
  let lastEdit = -1;
  tools.forEach((t, i) => { if (EDIT_TOOLS.has(t.name)) lastEdit = i; });
  if (lastEdit === -1) return { block: false, why: "bu turda dosya değişmedi" };
  const checked = tools.slice(lastEdit + 1).some(isCheck);
  if (checked) return { block: false, why: "son değişiklikten sonra kontrol çalıştı" };
  const files = [...new Set(tools.filter((t) => EDIT_TOOLS.has(t.name)).map((t) => t.input.file_path || t.input.notebook_path).filter(Boolean))];
  return { block: true, why: "son değişiklikten sonra kontrol yok", files };
}

export function reason(files = []) {
  const list = files.length ? `\nDeğişen dosyalar: ${files.slice(0, 8).join(", ")}${files.length > 8 ? " …" : ""}` : "";
  return (
    "kanıt: \"Bitti\" dedin ama son dosya değişikliğinden sonra hiçbir kontrol çalıştırmadın." +
    list +
    "\nŞimdi şunu yap: değişikliğin sonucunu kullanıcının göreceği yerde kontrol et (testi çalıştır, " +
    "programı çalıştır, sayfayı açıp ekran görüntüsü al) ve cevabına üç satır ekle: " +
    "İstenen: … / Kontrol: (çalıştırdığın komut ya da açtığın sayfa) / Sonuç: (gördüğün çıktı)." +
    "\nKontrol edemiyorsan \"doğrulanmadı\" yaz ve nedenini söyle; iddiayı geri çek." +
    "\n(English: you claimed done without running any check after your last edit. Verify, or say it is not verified.)"
  );
}
