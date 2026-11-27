# kanıt

Claude Code, son değişiklikten sonra bir kontrol çalıştırmadan **"bitti" diyemez.**

Tanıdık sahne: ajan "düzelttim" diyor, açıyorsun, aynı. Kod gerçekten değişmiş ama kimse sonuca
bakmamış. Sen "değişmemiş" diyorsun, ajan kodu gösterip ısrar ediyor.

`kanıt` iki parçadan oluşur:

- **Skill (`SKILL.md`):** Ajana bitirmeden önce ne yapacağını söyler. Sonucu kullanıcının göreceği
  yerde kontrol et, cevabın sonuna `İstenen / Kontrol / Sonuç` yaz, kontrol edemiyorsan
  "doğrulanmadı" de.
- **Kapı (`hooks/kapi.mjs`):** Talimat ajanın insafına kalmasın diye. Ajan durmak istediğinde
  çalışır. Üç koşul birlikteyse durmasına izin vermez ve kontrolü ister:
  1. Son mesajda bitti iddiası var (`bitti`, `düzelttim`, `tamamlandı`, `ekledim`, `çalışıyor`,
     `done`, `fixed`…),
  2. bu turda bir dosya değişmiş,
  3. son değişiklikten **sonra** hiçbir kontrol çalışmamış (test, derleme, programı çalıştırma,
     `curl`, tarayıcı, ekran görüntüsü).

Ajan dürüstçe "doğrulanmadı" derse kapı engellemez. Kapı bir turda en fazla bir kez durdurur.
Kendi hatasında (okunamayan girdi, eksik kayıt) asla engellemez.

```
Sen:   Giriş butonunu düzelt.
Ajan:  [Edit LoginButton.tsx]  Düzelttim.
Kapı:  "Bitti" dedin ama son değişiklikten sonra hiçbir kontrol çalıştırmadın…
Ajan:  [npm test] [sayfayı açar, ekran görüntüsü]
       İstenen: Giriş butonu tıklanınca formu göndersin.
       Kontrol: npm test -- login; /giris sayfasında butona bastım.
       Sonuç: 4/4 test geçti; yönlendirme /panel'e gitti.
```

## Kurulum

Claude Code skill klasörüne klonla:

```bash
git clone https://github.com/Golemozan/kanit ~/.claude/skills/kanit
```

Windows PowerShell:

```powershell
git clone https://github.com/Golemozan/kanit "$HOME\.claude\skills\kanit"
```

Sonraki oturumda kendiliğinden yüklenir (açık oturumda `/reload-plugins`). Node 18+ gerekir,
bağımlılık yoktur.

Yalnız bir projede istiyorsan projenin `.claude/skills/kanit` klasörüne klonla.

## Ayarlar

| Ortam değişkeni | Ne yapar |
|---|---|
| `KANIT_KAPALI=1` | Kapıyı kapatır (skill çalışmaya devam eder) |
| `KANIT_EK_KONTROL` | Kontrol sayılacak ek komut kalıbı (regex). Örnek: `\bjust check\b` |

Kaldırmak için klasörü sil ya da `claude plugin disable kanit@skills-dir`.

## Sınırlar

- **İddiayı kelimeden yakalar.** Listede olmayan bir ifadeyle "bitti" denirse kapı görmez; bazen
  de iddia olmayan bir cümleye takılır. Takıldığında maliyeti bir kontrol turudur.
- **Kontrolün doğru olduğunu bilemez.** Yalnız bir kontrolün *çalıştığını* görür. `node -e "1"`
  da kontrol sayılır. İşin kalitesi skill'in talimatına kalır.
- **Kabuktan yapılan değişikliği saymaz.** `sed -i` ya da `>` ile yazılan dosyalar "değişiklik"
  sayılmaz; yalnız Edit, Write, MultiEdit, NotebookEdit.
- Şu an yalnız Claude Code. Skill metni `SKILL.md` okuyan diğer ajanlarda da işe yarar, kapı yaramaz.

## Geliştirme

```bash
npm test
```

## Lisans

MIT
