from pathlib import Path
import json,sys,html
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT

R=Path(__file__).resolve().parents[1];OUT=Path(sys.argv[1]);OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('ArialTR',r'C:\Windows\Fonts\arial.ttf'));pdfmetrics.registerFont(TTFont('ArialTRB',r'C:\Windows\Fonts\arialbd.ttf'))
styles=getSampleStyleSheet()
for k in ['Normal','BodyText','Title','Heading1','Heading2','Heading3']:styles[k].fontName='ArialTRB' if k in ['Title','Heading1','Heading2','Heading3'] else 'ArialTR'
styles['BodyText'].fontSize=10;styles['BodyText'].leading=14;styles['BodyText'].spaceAfter=8
styles['Title'].fontSize=27;styles['Title'].leading=32;styles['Title'].textColor=HexColor('#123849')
styles['Heading1'].fontSize=18;styles['Heading1'].leading=22;styles['Heading1'].spaceAfter=14
styles['Heading2'].fontSize=12;styles['Heading2'].leading=16
small=ParagraphStyle('small',parent=styles['BodyText'],fontSize=8.2,leading=11)
story=[]
def p(t,style='BodyText'):story.append(Paragraph(html.escape(t).replace('\n','<br/>'),styles[style]))
def h(t):p(t,'Heading1')
def sub(t):p(t,'Heading2')
def table(head,rows,widths):
 data=[[Paragraph(html.escape(str(v)),small) for v in row] for row in [head]+rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#dce9ed')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.3,HexColor('#c4d1d6')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));story.append(t);story.append(Spacer(1,10))
def page():story.append(PageBreak())
build=json.loads((R/'qa/portable-build.json').read_text());verify=json.loads((R/'qa/portable-verification.json').read_text());full=json.loads((R/'qa/full-dataset-verification.json').read_text());idx=json.loads((R/'qa/code-index-0.0.1/code-index.json').read_text());requirements=json.loads((R/'docs/requirements.json').read_text())

p('SPACEAPPS1','Title');p('0.0.1 · Sürüm ve değişiklik raporu','Heading1');p('14 Kasım 2026 | İlk paylaşım sürümü | Windows x64')
p('Önceki iç prototip: 0.3.0. Kullanıcının talimatıyla paylaşım sürümü 0.0.1 olarak adlandırıldı. Bu numaralama, önceki çalışma geçmişinin silindiği veya kodun eskiye döndüğü anlamına gelmez.')
sub('Teslimin amacı');p('Uygulamayı tek EXE ile çalıştırmak; sabit bilimsel veri havuzunu ayrı ZIP olarak paylaşmak; veri klasörü aynı dizine yerleştirildiğinde otomatik bulmak; PSI dışı resmî kaynakları görünür kılmak.')
table(['Öğe','Bu sürüm'],[['Uygulama','SpaceApps1.exe · tek başlatıcı; ayrı servis/starter yok'],['Veri sözleşmesi','Veri_Seti / DATASET.json · 2026.11.14-v1'],['Kaynak kapsamı','24 PSI koleksiyonu + 11 destek web kaydı'],['Dosya erişimi','51.151 indeksli payload; PDF / metin / tablo dosyaları'],['Test','16 otomatik test; taşınmış EXE; gerçek veriyle dosya erişimi'],['Gerçek model çağrısı','Bu sürüm doğrulamalarında 0'],['Standart hedefi','NPR 7150.2D Class C mühendislik hedefi; sertifikasyon değil']],[140,370])
p('Animasyon/sekme yaması ayrı geliştirilir ve bu sürüme uygulanmamıştır. Tasarım tercihleri ile sayısal doğruluğu etkileyen değişiklikler ayrı önem seviyeleriyle izlenir.')
page();h('1 · Değişiklik nedeni ve önem sınıfları')
table(['Sınıf','Kural'],[['Düşük','Görsel tasarım tercihi, yerleşim veya animasyon beğenisi. Sayısal sonucu değiştirmemeli.'],['Orta','Dokümantasyon, bakım ve geliştirme izlenebilirliği boşluğu.'],['Yüksek','Veri kaybı/yanlış kaynak, anahtar sızıntısı, yanlış dosya erişimi, başlatmayı engelleyen hata.'],['Kritik','Kullanıcının özellikle belirttiği zoom davranışı; bilimsel hesaplama, ağırlık veya kritik/orta eşik değişikliği. Bağımsız doğrulama gerektirir.']],[80,430])
p('Önem seviyesi, değişikliğin büyüklüğünden ayrı değerlendirilir. Bu sürümde zoom, fiziksel ağırlık veya risk eşiği değiştirilmedi. Konu araması yangın olasılığı değildir. Kritik sınıf değişiklikler kalibrasyon olmadan üretim sonucu olarak açılmaz.')
table(['Kimlik','Önce / geri bildirim','Sonra / gerekçe','Önem'],[['CH-01','Dört metadata EXE içinde; tüm veri taşınamıyordu.','EXE yanındaki sürümlü sabit veri klasörü. Ayrı uygulama/veri dağıtımı.','Yüksek'],['CH-02','Dosyalara erişim güç; yalnız özet görünüyordu.','Kaynak/dosya araması, PDF açma ve metin önizleme.','Düşük UI / yüksek veri'],['CH-03','PSI dışı kaynaklar uygulamada görünmüyordu.','Apollo, Mir, rehber, Spinoff ve üç program açıklaması.','Yüksek'],['CH-04','Büyük katalog aralıklı açılmıyordu.','Async açılım, hash ve boyut limiti; tekrar test edildi.','Yüksek'],['CH-05','Her sürümün ayrıntılı rapor/kod haritası yoktu.','PDF, AST blok indeksi, kaynak snapshot ve kanıt kayıtları.','Orta']],[50,150,230,80])
page();h('2 · Paket ve klasör sözleşmesi')
p('Uygulama ZIP’i çıkarılınca SpaceApps1 klasörü oluşur. Veri ZIP’indeki Veri_Seti klasörü bunun içine taşınır. Kullanıcı yalnız SpaceApps1.exe dosyasına çift tıklar.')
p('SpaceApps1/\n    SpaceApps1.exe\n    release-manifest.json\n    Dokumantasyon/\n    Veri_Seti/\n        DATASET.json\n        PSI/\n        Destek_Kaynaklar/\n        _app/')
table(['Durum','Beklenen davranış'],[['Veri klasörü yok','Uygulama açılır; veri klasörünü yerleştirme mesajı gösterir. Sahte/gömülü dört kaynak göstermez.'],['Yanına doğru klasör kondu','Yeniden başlatmada sürüm ve indeks hashleri doğrulanır; katalog görünür.'],['İç içe Veri_Seti/Veri_Seti','Doğru kök bulunamaz; eksik klasör mesajı. Kullanım belgesinde düzeltme açıklanır.'],['Başka klasöre taşındı','EXE konumu esas alınır; kullanıcı masaüstü yolu bağımlılığı yok.'],['İndeks değişmiş/uyumsuz','Kaynak yükleme engellenir; uyumsuz paket mesajı gösterilir.'],['Tek dosya eksik/bozuk','O dosya açılırken boyut/SHA hatası; başarı diye sunulmaz.']],[140,370])
p('Veri değişmez bir sürüm olarak dağıtılır. Uygulama bilimsel payload dosyalarına yazmaz. Kaynakları güncellemek istenirse ileride yeni veri sürümü ve ayrı doğrulama gerekir.')
page();h('3 · Kaynak kapsamı ve eksikler')
p('Resmî Space Apps Resources sekmesi tarayıcıda yeniden açılarak kontrol edildi. 10 ana kaynak URL’si önceki kayıtla aynıydı. “Yeni eklendi” varsayımı doğrulanmadı. Buna rağmen PSI dışındaki sekiz yazılı destek kaynağı ve onların doğrudan belgeleri kontrol edildi.')
table(['Grup','Yerel durum'],[['PSI Combustion Science','Güncel katalogda 24 koleksiyon; 24/24 yerelde temsil ediliyor. Bu, her dosyanın eksiksiz olduğu anlamına gelmez.'],['Apollo 1 / Apollo 13 / Mir','Web metinleri ve önceden alınan ilgili PDFler destek havuzuna bağlandı.'],['Araştırmacı rehberi','Rehber PDFi mevcut; AI kartının web metni PDFin tüm metni değildir.'],['Spinoff','Fireman’s Air Tanks, Fire Detector, New Technology for the Fire Attire.'],['FM2 / FLARE / SoFIE','Ayrıntılı açıklama sayfaları eklendi. Ayrı sayısal deney paketi bulunmuş gibi sunulmaz.'],['ScienceCasts videosu','Bağlantı biliniyor; kullanıcı kapsamı gereği görüntü/video payloadı alınmadı.']],[140,370])
p('Sabit payload: 18.494.831.569 bayt, 51.151 indeksli dosya. Dizin/izleme ve kaynak indeksleriyle ZIP’in sıkıştırılmamış toplamı yaklaşık 18,69 GB’tır; dağıtım makbuzu kesin arşiv boyutunu verir.')
p('Açık kayıtlar: 67 erişilemeyen veya bilerek atlanan kaynak dosya kimliği; 2.269 içerik rolü incelemesi. 40 hariç tutulan dış arşiv, bu 67 kimlikle aynı sayım birimi değildir. İçerik/format sorunları ve özgün kaynak kalite notları korunur. Dosya bütünlüğü, bilimsel doğruluk veya tam NASA arşivi kapsamı demek değildir.')
page();h('4 · İşleyiş ve bilimsel sınır')
p('Tarayıcı → aynı bilgisayarda loopback HTTP servisi → sürümlü yerel veri indeksi → kullanıcının seçtiği kaynaklarla Gemini 3.1 Flash-Lite. Veri aramak veya dosya açmak model isteği başlatmaz.')
table(['Bileşen','Yaptığı / yapmadığı'],[['Araştırma listesi','24 PSI metadata ve 11 destek web metnini gösterir. 35 kayıt, 35 makale veya 35 deney koşusu demek değildir.'],['Dosya kütüphanesi','51.151 dosyanın kaynağını, kategorisini ve kalite notunu gösterir; erişimde hash doğrular.'],['AI bağlamı','Seçili metadata alanları veya destek web metni; tablo adları ölçüm içeriği sayılmaz.'],['Altı kaynak sınırı','Tek istekte en fazla altı kaynak. Kota ve bağlam yükünü sınırlamak için; diğerleri ayrı incelenebilir.'],['Alıntı doğrulama','Kimlik/alan ve birebir metin eşleşir. Bu, açıklamanın bilimsel olarak doğru olduğunu kanıtlamaz.'],['Sayısal eşleştirme','Tüm deney tabloları normalize edilmedi; fiziksel yüzde, kritik/orta eşik veya yangın olasılığı hesaplanmaz.']],[140,370])
p('Destek web metni en fazla 16.000 karakterlik bir alanla sunulur; kırpılma kaydı tutulur. Hipotez ve amaç, gerçekleşmiş sonuç olarak yorumlanmamalıdır. Operasyonel yangın müdahalesi onayı verilmez.')
page();h('5 · Dosya ve anahtar güvenliği')
table(['Kontrol','Uygulama'],[['Anahtar','Ayarlar panelinden girilir; Windows CurrentUser DPAPI ile LocalAppData altında kalır. EXE/ZIP’e eklenmez.'],['Paylaşım','Paket açık izin listesiyle hazırlanır; LocalAppData, .runtime ve gerçek anahtar dosyası alınmaz.'],['HTTP','127.0.0.1; Host kontrolü, POST nonce+Origin, JSON/gövde sınırı, CSP ve kaçışlama.'],['Dosya yolu','İndeks kimliği üzerinden erişim; ../, mutlak yol, ters bölü ve junction ile dışarı kaçış reddedilir.'],['Bütünlük','Açılışta metadata/indeks hashleri; dosya erişiminde boyut ve SHA. Gzip açılımı 64MiB ile sınırlı.'],['Model','Otomatik çağrı/retry/fallback yok; tek eşzamanlı çağrı, zaman aşımı ve kaynak hashli önbellek.']],[130,380])
sub('Yakalanan başlatma sorunu');p('Aynı SHA değeri taşıyan büyük katalog, Windows Node 25.9 senkron gunzip yolunda aralıklı “incorrect data check” üretti. Async açılım ve kopyalanmış buffer ile 15 ardışık tam katalog yüklemesi geçti; final EXE de gerçek veriyle yüklendi. Bunu dosyanın bozukluğu olarak kaydetmedik. Native platform kök nedeninin kesin kanıtı yoktur; G-11 kaydı sınırı korur.')
page();h('6 · Doğrulama kanıtları')
table(['Test grubu','Sonuç / kanıt'],[['Birim ve API','16/16 geçti: giriş aralıkları, alıntılar, cache, kota/hata, concurrency, anahtar, veri yolu ve hash. qa/test-results-0.0.1.txt'],['Taşınmış EXE','Boş PATH; ayrı Node gerekmedi. Eksik/eklenmiş veri klasörü, PSI+REF, CSV, şifreli test anahtarı yeniden açılış ve kapanış.'],['Gerçek katalog','24+11 kayıt, tüm kaynak dosya sayıları, BASS-II CSV önizleme ve PDF bytes/SHA.'],['Tekrar yükleme','Büyük katalog 15 kez başarıyla açıldı.'],['Tarayıcı','BASS-II dosya listesi, CSV içeriği ve Apollo13 destek dosyaları görüldü.'],['Model çağrısı','Bu testlerin tamamında gerçek sağlayıcı çağrısı 0.'],['ZIP','Kaynak payload SHA karşılaştırması ve bütün arşiv üyelerinin açılmış SHA/CRC readback kontrolü ayrı dağıtım makbuzunda.']],[120,390])
p('Temiz ikinci Windows bilgisayarı, SmartScreen/dijital imza, bağımsız insan kod incelemesi ve bilimsel değerlendirme tamamlanmış sayılmaz. Testler aynı Windows makinesinde farklı konum/profil ile yapılmıştır.')
p('EXE SHA-256: '+build['sha256']);p('EXE bayt: '+str(build['bytes'])+' | Test edilen EXE hash’i ile build manifesti eşleşir: '+str(build['sha256']==verify['sha256']))
page();h('7 · Gözlenen veri erişimi')
shot=R/'qa/portable-dataset-0.0.1.jpg'
if shot.exists():story.append(Image(str(shot),width=510,height=287))
p('Apollo 13 destek grubu, filtrelenmiş dosyalar ve PDF erişimi. Ekran gerçek 0.0.1 EXE’den alınmıştır; sentetik eşleşme veya model yanıtı değildir.')
p('BASS-II CSV önizlemesinde numune malzemesi, test kimliği, kalibre başlangıç/son oksijen, CO/CO2 alanları görüldü. Bu ekranın çalışması, bütün dosyaların ortak şemaya dönüştürüldüğünü kanıtlamaz.')
page();h('8 · Kod / frame indeksi')
p(f"Bu sürümün indeksi {len(idx['files'])} kaynak dosyası ve {len(idx['blocks'])} kod parçası içerir. index.html aranabilir insan görünümü; code-index.json/CSV makine ve tablo görünümüdür. Kaynak snapshotları aynı klasörde bulunur.")
table(['Alan','Anlam'],[['id / parent','Sürümle bağlı parça kimliği ve içinde bulunduğu üst blok.'],['file / sourceHash','Göreli dosya yolu ve dosyanın SHA-256 kimliği.'],['start / end / columns','Satır ve JS için sütun konumu; tek satırda birden çok blok ayrılır.'],['function / loop','En yakın fonksiyon ve döngü kimliği; dosya seviyesi için boş.'],['kind / blockHash','AST türü ve mümkün olduğu yerde parça metninin hash’i.'],['purpose / purposeBasis','Amaç etiketi ve kaynağı. Modül açıklamaları gözden geçirilmiş; alt blokların çoğu sözdiziminden türetilmiştir.']],[130,380])
p('Kapsam: JS fonksiyon/callback, döngü, koşul, statement/declaration ve çağrı; Python AST; HTML öğeleri; CSS kuralları. Değişken adlarını ve çağrı metnini gösteren otomatik etiketler tam anlamsal inceleme yerine geçmez. Kod parçaları indekslendi; tüm büyük fonksiyonların fiziksel olarak küçük dosyalara ayrıldığı iddia edilmez.')
p('İleride bir değişiklik için önce indeks üzerinden dosya/fonksiyon/döngü bulunur; ilgili ister ve test belirlenir; kaynak hash’iyle baz sürüm doğrulanır; değişiklik sonrası indeks yeniden üretilir. Eski sürümün indeksi değiştirilmez.')
page();h('9 · Modül haritası ve standart izi')
table(['Dosya','Sorumluluk'],[[x['file'],x['purpose']] for x in idx['files'] if x['file'].startswith('lib/') or x['file'] in ['server.mjs','portable.mjs','public/app.js']],[145,365])
table(['İster','Kod / doğrulama'],[['FIF-001 / 014','dataset.mjs, portable.mjs, build/package scripts; klasör/sürüm/hash ve taşınmış EXE testleri.'],['FIF-015','dataset.mjs, server.mjs, app.js; dosya yolu, PDF/CSV, arama ve readback.'],['FIF-016','corpus.mjs, gemini.mjs; PSI dışı metin, seçili kaynak ve alıntı sınırı.'],['SWE-050/052/061/066','İster, tasarım, uygulama ve test izleri; tam standarda uygunluk kapanışı değil.'],['SWE-073/081/154','Hedef ortam, konfigürasyon ve güvenlik kanıtları; bağımsız kabul bekleniyor.']],[130,380])
p('NPR7150.2D matrisinde 100 satır, Class C sütununda 92 X var. Hiçbir satır yalnız bu testler nedeniyle tam uyum olarak kapatılmadı. Resmi sınıflandırma, assurance, bağımsız review ve güvenlik kritikliği değerlendirmeleri açık kalır.')
page();h('10 · Sonraki yama ve yayın kontrolü')
p('Kullanıcının yeni geri bildirimleri ayrı yamada: sol girdiler korunacak; Gemini paneli aşağı açılıp çalışma alanını itecek; ilk Eşleştirme sonuçları sekmesi kapatılamayacak; rapor/veri sekmeleri üstte açılacak; eşleştir eyleminden önce kart gösterilmeyecek; sağ panel genişken 1/3, darken 1/6 ekran payı kullanacak.')
p('Bu görsel değişiklikler düşük önemlidir. Sayısal benzerlik, kritik/orta eşik ve düşük eşleşmeleri eleme davranışı bilimsel sonucu etkilediği için kritik gereksinim olarak ayrı tutulur. Kalibrasyon ve doğrulama olmadan gerçek yüzde sonucu gösterilmeyecek. Yama sentetik testleri varsa gerçek NASA deneyi veya model önerisi olarak sunulmayacak.')
table(['Yayın kontrolü','Kayıt'],[['Uygulama','Sürüm 0.0.1, EXE hash ve taşınmış çalıştırma makbuzu.'],['Veri','2026.11.14-v1; ZIP tam readback ve SHA makbuzu.'],['Dokümantasyon','Bu PDF; kod HTML/CSV/JSON indeksi; kaynak snapshot; ister/risk/standart matrisi.'],['Anahtar','Dağıtım izin listesi dışında; kullanıcının yerel kaydı paketleme için silinmez.'],['Yama','Ayrı klasör ve ZIP; mevcut sürüme entegre edilmedi.']],[120,390])
p('Rapor sürümü: 0.0.1. Hazırlanma: '+datetime.now().isoformat(timespec='seconds')+'. Nihai ZIP bayt/hash değerleri dosyanın yanındaki release/distribution verification kayıtlarından okunmalıdır; bu rapor sonradan değişen arşivleri otomatik onaylamaz.')
def footer(c,d):
 c.setStrokeColor(HexColor('#c4d1d6'));c.line(42,39,553,39);c.setFont('ArialTR',8);c.setFillColor(HexColor('#526875'));c.drawString(42,25,'SpaceApps1 0.0.1 · Değişiklik ve mühendislik kaydı');c.drawRightString(553,25,str(d.page))
SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),leftMargin=42,rightMargin=42,topMargin=42,bottomMargin=55,title='SpaceApps1 0.0.1 Sürüm Raporu',author='SpaceApps1 proje ekibi').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
