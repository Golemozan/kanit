---
name: kanit
description: Bir işi bitirdiğini söylemeden önce kullan. Kod düzelttin, özellik ekledin, ayar değiştirdin, dosya yazdın ve "bitti / düzelttim / çalışıyor / done / fixed" demek üzeresin: önce sonucu kullanıcının göreceği yerde kontrol et, sonra kanıtıyla söyle. Tetikleyiciler - "bitti mi", "çalışıyor mu", "emin misin", "kontrol et", "doğrula", "verify", "is it done", ve her değişiklik turunun sonu.
---

# kanıt

"Bitti" bir iddiadır. Kanıtı olmayan iddia teslim değildir.

Ajanların en sık hatası kodu doğru yazıp sonucu hiç görmemek: dosya değişti ama sayfa aynı,
test yeşil ama yanlış şeyi ölçüyor, fonksiyon düzeldi ama çağrılmıyor. Bu skill'in kuralı tek:
**son değişiklikten sonra sonucu kendin gör, gördüğünü yaz.**

## Bitirmeden önce

1. **İsteneni tek cümleyle yaz.** Kullanıcının dediğini, senin yorumunu değil.
   "Butona tıklayınca form gönderilsin" — "submit handler'ı düzelt" değil.
2. **Sonucu kullanıcının göreceği yerde kontrol et.** Kodun içinde değil, çıktıda:

   | Değişen şey | Kontrol |
   |---|---|
   | Fonksiyon, mantık | İlgili testi çalıştır; yoksa küçük bir çağrıyla gerçek girdiyle dene |
   | Arayüz, sayfa | Sayfayı aç, ekran görüntüsü al, değişen yere bak |
   | API, sunucu | İsteği at (`curl`), dönen cevabı oku |
   | Komut satırı aracı | Komutu gerçek argümanla çalıştır |
   | Ayar, yapılandırma | Ayarı okuyan programı çalıştır, etkisini gör |
   | Belge, metin | Kullanıcının istediği her maddeyi metinde tek tek bul |

3. **Kontrol son değişiklikten sonra olmalı.** Testi çalıştırıp sonra bir satır daha
   değiştirdiysen o test artık kanıt değil; tekrar çalıştır.
4. **Varsayılan durumda dene.** Demoyu güzel gösteren koşul (koyu tema, dolu veri, senin
   makinen) hatayı saklayabilir. Kullanıcının ilk açtığı haliyle bak.

## Nasıl söylenir

Bitti derken cevabın sonuna üç satır koy:

```
İstenen: Butona tıklayınca form gönderilsin.
Kontrol: npm test -- form.test.ts; sayfayı açıp butona bastım, ekran görüntüsü aldım.
Sonuç: 6/6 test geçti; gönderimden sonra "Kaydedildi" mesajı göründü.
```

**Kontrol edemiyorsan** (ortam yok, anahtar yok, kullanıcının cihazı gerekiyor) "bitti" deme.
"Doğrulanmadı" yaz, nedenini ve kullanıcının nasıl kontrol edeceğini söyle:

```
Değişiklik yazıldı, doğrulanmadı: ödeme sağlayıcısının test anahtarı yok.
Kontrol etmek için: .env'e test anahtarını koy, `npm run dev`, /odeme sayfasında 4242… kartıyla dene.
```

## Kullanıcı "değişmemiş" derse

Kodu kanıt olarak gösterme. Kullanıcının ne gördüğünü öğren, aynı yere sen de bak.
"Kod doğru" ile "kullanıcı doğru sonucu görüyor" ayrı iddialardır; ikincisini kanıtlamadıysan
birincisi bir şey söylemez.

## Kapı

Bu klasörde bir Stop kapısı (`hooks/kapi.mjs`) var. Son mesajında bitti iddiası varsa, bu turda
dosya değiştirdiysen ve son değişiklikten sonra hiçbir kontrol (test, derleme, çalıştırma, `curl`,
tarayıcı, ekran görüntüsü) çalışmadıysa durmana izin vermez. Kapı seni durdurursa tartışma:
kontrolü yap ya da "doğrulanmadı" de.
