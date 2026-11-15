from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak,Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
r=Path(__file__).resolve().parents[1];o=r/'qa/report-layout';o.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('TR',r'C:/Windows/Fonts/arial.ttf'));pdfmetrics.registerFont(TTFont('TRB',r'C:/Windows/Fonts/arialbd.ttf'))
s=getSampleStyleSheet()
for k in ['Title','Heading1','Heading2','BodyText']:s[k].fontName='TRB' if k!='BodyText' else 'TR'
s['BodyText'].leading=14;s['BodyText'].spaceAfter=8
parts=[]
def t(x,style='BodyText'):parts.append(Paragraph(x,s[style]))
issues=json.loads((r/'docs/defects-0.0.5-to-0.1.0.json').read_text(encoding='utf-8'))['issues'];b=json.loads((r/'qa/portable-build.json').read_text(encoding='utf-8'));ix=json.loads((r/'qa/code-index-0.1.0/code-index.json').read_text(encoding='utf-8'))
t('SpaceApps1 0.1.0','Title');t('Hatalı 0.0.5 arşivinden düzeltilmiş sürüme','Heading2')
t('14 Kasım 2026. Kullanıcı talimatıyla daha önce 0.0.9 adıyla oluşturulmuş paket 0.0.5 — HATALI arşiv etiketiyle tutulur. Hatalı EXE yeniden derlenmez; özgün iç sürümü 0.0.9 ve hash’i kanıt olarak korunur. Güncel çalıştırılabilir sürüm 0.1.0’dır. 0.0.10 taslak numarası yayımlanmadı.')
t('Teslim sözleşmesi','Heading2');t('SpaceApps1.exe tek başlatıcıdır; Node veya Rust kurulumu gerekmez. Veri_Seti ayrı sabit pakettir ve EXE yanına konur. Sürüm ZIP’i iki kardeş klasör içerir: SpaceApps1 ve Geliştirici Yaması. Uygulamanın Yamalar klasöründe yalnız kısa değişiklik özeti bulunur. Ayrıntılı PDF, hata kayıtları, önceki/sonraki kodlar, kod farkları, kaynak indeksi ve test kayıtları Geliştirici Yaması içindedir. Rapor veya yama için iç içe ZIP kullanılmaz. API anahtarı pakete konmaz; yerel kullanıcı kaydı korunur.')
t('Davranış ve kapsam','Heading2');t('Enter gönderir, Ctrl+Enter imleç konumuna satır ekler; IME kompozisyonu kesilmez. Minimum8karakter kaldırıldı; boş mesaj reddedilir ve1400karakter üst sınır sürer. Kaynak seçmeden sohbet başlatılır; önceki son8mesaj oturum belleğinde bağlam olarak tutulur, dosyaya konuşma geçmişi kaydedilmez.')
t('Eşleştir düğmesi HTTP501 yerine yerel araştırma adaylarını döndürür. Sıralama kaynak metnindeki kavramlar ve girdi alanlarının konu terimleriyle yapılır; girilen21%oksijenin deneyde tam21%olduğunu kanıtlamaz. Kartlar İlgili kaynak etiketlidir; fiziksel yüzde, kritik/orta risk eşiği veya yangın olasılığı üretilmez. Bu bilimsel hesaplama açığı halen KRİTİK ve açıktır.')
t('Modelin web araması / URL okuma aracı yoktur. Ağ yalnız sabit Gemini API çağrısı için kullanılır; model tamamen çevrimdışı değildir. Bilimsel bağlam yerel metadata/web metni ve hash-doğrulanan küçük CSV/TSV/TXT/MD alıntılarıdır. Modelin önceden öğrendiği bilgiyi hiç kullanmayacağı mutlak biçimde kanıtlanamaz; bilimsel maddelerde kaynak alıntısı kontrol edilir, kanıtsız yanıt ayrı sınıftır.')
for subset,title in [(issues[:4],'Hata kayıtları / işlev'),(issues[4:],'Görsel düzeltmeler ve açıklar')]:
 parts.append(PageBreak());t(title,'Heading1')
 for issue in subset:
  t(issue['id']+' · '+issue['severity'].upper()+' · '+issue['status'],'Heading2')
  for key,label in [('before','Önce'),('cause','Neden'),('fix','Düzeltme'),('verification','Kontrol')]:t(label+': '+issue[key])
parts.append(PageBreak());t('Doğrulama / kaynak indeksi','Heading1')
t('30/30 otomatik test geçti. Gerçek taşınabilir EXE PATH boşken, dış Node olmadan, Türkçe/boşluklu konumda çalıştırıldı; anahtar şifreleme/yeniden başlatma, eksik veri, modül yükleme ve200eşleştirme yanıtı kontrol edildi. Gerçek veri kataloğu35kaynak/51.151dosya yükledi; BASS-II CSV/PDF erişimi doğrulandı. Bu, bütün PDF/Excel içeriklerinin normalize edilmesi değildir.')
t('Tarayıcı: Ctrl+Enter sonucu a\\n; Enter ile tek karakter mesaj sunucuya gitti. İzole profilde anahtar olmadığı için beklenen anahtar mesajı alındı. Gerçek ücretli Gemini çağrısı yapılmadı; yanıt şeması ve konuşma davranışı sahte sağlayıcıyla test edildi. Gerçek ağ/model yanıt kalitesi ve ikinci bilgisayar testi açık kalır.')
t('EXE SHA-256: '+b['sha256']);t('Kod indeksi: '+str(len(ix['files']))+' dosya, '+str(len(ix['blocks']))+' blok. Her blok dosya/satır/fonksiyon/döngü ve hash ile bağlıdır. Sözdiziminden türetilen açıklamalar tam anlamsal inceleme değildir. FIF-018, risk G-13 ve NPR matris kanıtları güncellendi. NASA NPR7150.2D Class C tam uygunluk/sertifikasyon iddiası yoktur.')
t('Bağlam sınırı: En çok6kaynak; kaynak başına ilk2uygun metin dosyası; dosya en çok256KB ve gönderilen alıntı en çok12KB. Kesilme/kaynak hash’i kaydedilir. Dosya hash’i bozuksa dışlanır. PDF/Excel otomatik metin çıkarımı henüz yoktur. Bu sınırlar tüm18GBverinin model tarafından okunduğu iddiasını dışlar.')
im=r/'qa/portable-ui-0.1.0.png';w,h=PILImage.open(im).size;scale=min(480/w,180/h);parts.append(Image(str(im),width=w*scale,height=h*scale))
SimpleDocTemplate(str(o/'Hata_ve_Surum_Raporu_0.1.0.pdf'),rightMargin=44,leftMargin=44,topMargin=40,bottomMargin=40).build(parts)
