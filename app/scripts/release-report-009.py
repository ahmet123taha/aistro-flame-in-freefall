from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak,Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
r=Path(__file__).resolve().parents[1];out=Path(r'C:\Users\Ahmet Taha\Desktop\Spaceapps\Releases\0.0.9\SpaceApps1\Dokumantasyon');out.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('TR',r'C:/Windows/Fonts/arial.ttf'));pdfmetrics.registerFont(TTFont('TRB',r'C:/Windows/Fonts/arialbd.ttf'))
s=getSampleStyleSheet()
for k in ['Title','Heading1','Heading2','BodyText']:s[k].fontName='TRB' if k!='BodyText' else 'TR'
s['BodyText'].leading=15;s['BodyText'].spaceAfter=10
parts=[]
def t(x,style='BodyText'):parts.append(Paragraph(x,s[style]))
build=json.loads((r/'qa/portable-build.json').read_text(encoding='utf-8'));idx=json.loads((r/'qa/code-index-0.0.9/code-index.json').read_text(encoding='utf-8'))
t('SpaceApps1 · 0.0.9','Title');t('Uygulanmış UI yaması / portable sürüm raporu','Heading2');t('14 Kasım 2026 · Kullanıcı düzeltmesiyle 0.0.2 etiketi 0.0.9 oldu; işlevsel değişiklik yok. Önceki dağıtım temeli: 0.0.1. Uygulanan yama: 0.0.1-ui-preview.3.')
t('Teslim ve çalıştırma','Heading2');t('Yeni dağıtım ZIP’i SpaceApps1 klasörünü içerir. SpaceApps1.exe tek başlatıcıdır; Node veya Rust kurulumu gerekmez. Yamalar klasöründe uygulanmış kaynak yamasının ayrı ZIP’i bulunur. Önceki 0.0.1 ve yama ZIP’leri korunmuştur. Veri_Seti ayrı dağıtılır; mevcut sabit klasör EXE yanına konur. Veri arşivi uygulama ZIP’inde yeniden çoğaltılmaz.')
t('Değişim gerekçesi / DÜŞÜK görsel önem','Heading2');t('Kullanıcı orta alandaki başlık, arama, filtre ve veri özeti kalabalığını istemedi. Yerine örnekteki gibi yatay sekme şeridi uygulandı. İlk sonuç sekmesi sabittir; rapor/veri sekmeleri araştırma adıyla açılır. Dosya kütüphanesi ve JSON dışa aktarma Ayarlar bölümüne taşınmıştır.')
t('Koyu tema varsayılandır; açık/koyu düğmesi vardır. Tercih aynı tarayıcı origin/portunda localStorage ile korunur. Farklı portta varsayılan tema döner. Gemini paneli açılırken çalışma alanını aşağı iter; kullanıcı balonu, sade yanıt, altta yuvarlak mesaj kutusu, kaynak bağlam menüsü ve kopyalama düğmesi vardır. Sohbet son soru/yanıtı gösterir, kalıcı çok turlu konuşma henüz yoktur.')
t('KRİTİK açık kapsam / G-12','Heading2');t('Üretimde sayısal eşleştirme, deney satırlarının normalizasyonu ve fiziksel eşik/ağırlık kalibrasyonu tamamlanmadı. /api/match HTTP501 MATCHING_NOT_CONFIGURED döndürür. Bu yüzden Eşleştir akışından gerçek sonuç kartları gelmez ve buradan AI kaynak seçimi de tamamlanamaz. Belgeler Ayarlar dosya kütüphanesinden okunabilir. Önizlemenin sentetik yüzdeleri ve yanıtları üretim EXE’sine dahil edilmedi. Bu sürüm tamamlanmış bilimsel karar destek sistemi olarak sunulmamalıdır.')
parts.append(PageBreak());t('Doğrulama ve hata izi','Heading1')
t('25/25 otomatik test geçti: mevcut veri/anahtar/HTTP testleri ile kalıcı sekme, tekil sekme, kapanış, kalibrasyon yokluğu, sentetik skor reddi ve eşleştirme endpoint kontrolleri. Portable EXE PATH boşken, dış Node olmadan, farklı Türkçe/boşluklu konumda başlatıldı. Veri klasörü eksikliği ve sonradan eklenmesi; şifreli test anahtarının yeniden başlatmada korunması ve çift açılış kontrol edildi.')
t('Test edilen EXE SHA-256: '+build['sha256']);t('EXE boyutu: '+str(build['bytes'])+' bayt. Gerçek sabit veriyle 24 PSI + 11 destek kaydı ve 51.151 dosya indeksi yüklendi; bütün kaynak dosya sayıları eşleşti. BASS-II CSV metni ve PDF hash’i doğrulandı. Bu gerçek-veri kontrolü tüm dosyaların tekrar indirilmesi veya yeniden bilimsel okunması değildir; önceki veri ZIP’inin hash doğrulaması ayrı kayıttadır.')
t('Tarayıcıda gerçek EXE’nin 0.0.9 sürümü, koyu tema, sade sekmeler, Gemini paneli ve sayısal eşleştirme yapılandırılmadı mesajı görüldü. Gerçek API çağrısı yapılmadı. İkinci bağımsız bilgisayar, kod imzası ve SmartScreen değerlendirmesi yapılmadı.')
t('Test aracı hatası / giderildi','Heading2');t('Sürüm metni güncellenirken iki doğrulama scriptindeki localhost yanlışlıkla 127.0.0.2 olmuştu. İlk doğrulama bağlantı hatası verdi. 127.0.0.1 geri kondu; portable ve gerçek-veri testleri başarılı yeniden çalıştırıldı. Üretim listener adresi değişmemişti. Bu kayıt test aracındaki hatayı uygulama hatasından ayırır.')
t('Güvenlik ve standardın durumu','Heading2');t('Dağıtıma API anahtarı eklenmedi. Yerel kullanıcı anahtarı silinmedi; testler izole profil kullanır. Uygulama loopback üzerinde çalışır. Yama ZIP’inde geliştirme önizlemesi vardır, otomatik başlamaz. NPR7150.2D Class C bir mühendislik hedefidir; tam uygunluk veya NASA sertifikasyonu yoktur. İster FIF-017 ve ilgili matris satırları güncellendi; kritik bilimsel açık kapatılmadı.')
parts.append(PageBreak());t('Kod indeksi ve dağıtım içeriği','Heading1')
t(str(len(idx['files']))+' kaynak dosyası; '+str(len(idx['blocks']))+' AST/HTML/CSS kod bloğu. Dokumantasyon/Kod_Indeksi/index.html aranabilir görünüm, JSON/CSV makine kayıtları, kaynak klasörü hash bağlı asılları içerir. Sözdiziminden üretilen blok açıklamaları bağımsız anlamsal inceleme değildir; kodun fiziksel olarak küçük modüllere tamamen ayrıldığı iddia edilmez.')
t('Değişen bileşenler: public/app.js (tema, sohbet, renderDoc), public/styles.css, public/index.html, public/workspace-state.mjs (sekme ve skor politikası), server.mjs (match kapısı ve modül sunumu), scripts/build-portable.mjs (yeni asset), lib/version.mjs (0.0.9). Testler: workspace.test.mjs, matching.test.mjs ve mevcut testler. Yayın araçları/isterler/riskler/matris de sürümlendi.')
t('SpaceApps1/SpaceApps1.exe<br/>SpaceApps1/Yamalar/UI_Animation_vNext_0.0.1-ui-preview.3.zip<br/>SpaceApps1/Dokumantasyon/SpaceApps1_0.0.9_Surum_Raporu.pdf<br/>SpaceApps1/Dokumantasyon/Kod_Indeksi/<br/>SpaceApps1/Dokumantasyon/Dogrulama/<br/>SpaceApps1/Veri_Seti/ — ayrı veri ZIP’inden kullanıcı ekler.')
t('Son ZIP tam üye CRC/SHA-256 okumasından sonra doğrulanmış sayılır. ZIP hash’i ve üye doğrulama sonucu dıştaki .verification.json makbuzundadır. İç yama ZIP’i de özgün SHA-256 ile karşılaştırılır. Kullanıcıya gösterilen paket boyutu sıkıştırılmış aktarım boyutudur.')
im=r/'qa/portable-ui-0.0.9.png';w,h=PILImage.open(im).size;scale=min(480/w,280/h);parts.append(Image(str(im),width=w*scale,height=h*scale))
SimpleDocTemplate(str(out/'SpaceApps1_0.0.9_Surum_Raporu.pdf'),rightMargin=44,leftMargin=44,topMargin=40,bottomMargin=40).build(parts)
