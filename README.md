# Birthday Wallet

## Yerel yönetim paneli

Windows'ta `yonetim.bat` dosyasına çift tıklayın. Başlatıcı PATH üzerindeki Node.js'i veya Codex'in beraberinde gelen Node.js'i kullanır; Codex'in Git konumunu da PATH'e ekler. Panel `http://127.0.0.1:8765` adresinde açılır. Terminal açık kaldığı sürece çalışır; kapatmak için Ctrl+C kullanın.

1. `people.json` listesinden doğum günü kişisini seçin. Panel açılırken İstanbul tarihine göre bugün veya sıradaki doğum günü seçilir. Aynı tarihte birden fazla kişi varsa seçimden değiştirebilirsiniz.
2. IBAN kişisini seçin. Sağdaki listeden kişi ekleyebilir, adını ve IBAN'ını değiştirebilir veya kaldırabilirsiniz. Türk IBAN kontrol numarası doğrulanır.
3. Pasta tutarı ve katkı yapacak kişi sayısını girin. Kişi başı katkı otomatik bölünür ve yukarı tam TL’ye yuvarlanır (ör. 2500 TL / 17 kişi → 148 TL). Toplam toplanacak tutar ve fark gösterilir. İsterseniz kişi başı katkıyı elle değiştirebilirsiniz. Önizlemeyi kontrol edin; gerekirse aktif işaretini kaldırın.
4. **Yerel kaydet** yalnızca `ibans.json` ve `contribution.json` dosyalarını günceller. **Kaydet ve GitHub’a yayınla** ayrıca proje dosyalarını commit eder ve mevcut dalı `origin` uzak deposuna pushlar.

GitHub SSH erişimi ve Git kullanıcı adı/e-postası bilgisayarda ayarlı olmalıdır. Push reddedilirse panel hata gösterir ve kaydedilen dosyaları korur; uzak değişiklikleri inceleyip birleştirdikten sonra tekrar yayınlayabilirsiniz. Panel force push yapmaz. Başka dosyalar staging alanındaysa yayın durur.

İşlem sırasında buton bekleme durumunu gösterir; sonuç ve hatalar butonun altında görünür. Sunucu her işlem aşamasını ve Git hatalarını yerel `admin.log` dosyasına ve terminale yazar. Log dosyası Git'e gönderilmez. SSH işlemi parola istemeden çalışır; erişim sorunu veya zaman aşımı hata olarak bildirilir. Sunucu kodu değiştiğinde çalışan terminali Ctrl+C ile kapatıp `yonetim.bat` dosyasını yeniden açın ve tarayıcıyı yenileyin.

Başlangıçta `.git` klasörüne yazma erişimi kontrol edilir. Erişim yoksa panel başlatılmaz. Başlatıcıyı Windows Dosya Gezgini'nden açın; Codex'in kısıtlı terminalinden başlatılan sunucu Git'e yazamayabilir. Panel zaten çalışıyorsa başlatıcı mevcut paneli açar; sunucunun oturumunu değiştirmek için önce çalışan sunucuyu kapatın.

`Birthday.html` güncel katkıyı `contribution.json` dosyasından okur; her etkinlikte HTML düzenlemek gerekmez. GitHub Pages'in bu dalı yayınlayacak şekilde önceden ayarlanmış olması gerekir. IBAN listesi repoya pushlanır ve Pages üzerinden erişilebilir; listeye sadece paylaşılacak hesapları ekleyin. Yönetim işlemleri yalnızca yerelde çalışan sunucudan yapılabilir.
