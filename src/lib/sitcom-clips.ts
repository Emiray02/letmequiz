/**
 * Curated Almanca sitcom / vlog / sketch klipleri.
 * Her klip CEFR seviyesi, anahtar dilbilgisi konusu ve odak kelimelerle eşleşir.
 * NOT: YouTube linkleri Easy German, Lingoni, Get Germanized gibi açık erişim kanallardan
 * arama sorguları olarak verilmiştir; oynatıcı doğrudan o aramayı açar.
 */

export type ClipCategory = "sitcom" | "vlog" | "easy-german" | "tutorial" | "comedy";

export type SitcomClip = {
  id: string;
  title: string;
  cefr: "A1" | "A2" | "B1" | "B2";
  category: ClipCategory;
  scenario: string;
  transcript: string;
  translation: string;
  highlightPhrase: string;
  vocab: { word: string; meaning: string }[];
  grammarFocus: string;
  watchUrl: string;
};

export const SITCOM_CLIPS: SitcomClip[] = [
  {
    id: "a1-cafe-bestellen",
    title: "Im Café — Bestellung aufgeben",
    cefr: "A1",
    category: "sitcom",
    scenario: "Bir kafede kahve ve kek sipariş etmek.",
    transcript:
      "— Hallo, was möchten Sie?\n— Einen Kaffee, bitte. Und ein Stück Kuchen.\n— Gerne. Möchten Sie Milch?\n— Ja, ein bisschen.",
    translation:
      "— Merhaba, ne arzu edersiniz?\n— Bir kahve lütfen. Bir de dilim kek.\n— Memnuniyetle. Süt ister misiniz?\n— Evet, biraz.",
    highlightPhrase: "Einen Kaffee, bitte.",
    vocab: [
      { word: "der Kaffee", meaning: "kahve" },
      { word: "das Stück", meaning: "parça/dilim" },
      { word: "die Milch", meaning: "süt" },
      { word: "ein bisschen", meaning: "biraz" },
    ],
    grammarFocus: "möchten + Akkusativ (höflicher Wunsch).",
    watchUrl: "https://www.youtube.com/results?search_query=easy+german+cafe+bestellen",
  },
  {
    id: "a1-vorstellen",
    title: "Sich vorstellen — Erste Begegnung",
    cefr: "A1",
    category: "easy-german",
    scenario: "İki kişi tanışıyor, kendini tanıtıyor.",
    transcript:
      "— Hallo! Ich heiße Anna. Und du?\n— Ich bin Mehmet. Schön, dich kennenzulernen.\n— Woher kommst du?\n— Ich komme aus der Türkei. Und du?",
    translation:
      "— Selam! Adım Anna. Sen?\n— Ben Mehmet. Tanıştığımıza memnun oldum.\n— Nerelisin?\n— Türkiye'denim. Sen?",
    highlightPhrase: "Schön, dich kennenzulernen.",
    vocab: [
      { word: "heißen", meaning: "isimlenmek" },
      { word: "kommen aus", meaning: "-den gelmek" },
      { word: "die Türkei", meaning: "Türkiye" },
    ],
    grammarFocus: "W-Fragen: wie, woher, wo + Personalpronomen.",
    watchUrl: "https://www.youtube.com/results?search_query=easy+german+sich+vorstellen",
  },
  {
    id: "a2-arzttermin",
    title: "Beim Arzt — Termin vereinbaren",
    cefr: "A2",
    category: "sitcom",
    scenario: "Telefonla doktor randevusu alıyor.",
    transcript:
      "— Praxis Dr. Weber, guten Tag.\n— Guten Tag, ich hätte gern einen Termin.\n— Worum geht es?\n— Ich habe seit gestern Halsschmerzen.\n— Können Sie morgen um zehn Uhr kommen?",
    translation:
      "— Dr. Weber muayenehanesi, iyi günler.\n— İyi günler, randevu almak istiyorum.\n— Konu nedir?\n— Dünden beri boğaz ağrım var.\n— Yarın saat onda gelebilir misiniz?",
    highlightPhrase: "Ich hätte gern einen Termin.",
    vocab: [
      { word: "der Termin", meaning: "randevu" },
      { word: "die Halsschmerzen", meaning: "boğaz ağrısı" },
      { word: "vereinbaren", meaning: "kararlaştırmak" },
    ],
    grammarFocus: "Konjunktiv II (hätte gern) + seit + Dativ (Zeit).",
    watchUrl: "https://www.youtube.com/results?search_query=deutsch+arzt+termin+dialog+a2",
  },
  {
    id: "a2-supermarkt",
    title: "Im Supermarkt — Einkauf",
    cefr: "A2",
    category: "vlog",
    scenario: "Markette ürün arıyor, fiyat soruyor.",
    transcript:
      "— Entschuldigung, wo finde ich die Milch?\n— Im Kühlregal, hinten links.\n— Danke! Wie viel kostet ein Liter?\n— Ein Euro neunundzwanzig.",
    translation:
      "— Affedersiniz, sütü nerede bulurum?\n— Soğuk reyonda, arkada solda.\n— Teşekkürler! Bir litre kaç para?\n— Bir euro yirmi dokuz.",
    highlightPhrase: "Wo finde ich die Milch?",
    vocab: [
      { word: "das Kühlregal", meaning: "soğutucu reyon" },
      { word: "kosten", meaning: "fiyatı olmak" },
      { word: "der Liter", meaning: "litre" },
    ],
    grammarFocus: "Lokale Präpositionen + Dativ.",
    watchUrl: "https://www.youtube.com/results?search_query=easy+german+supermarkt",
  },
  {
    id: "b1-bewerbung",
    title: "Vorstellungsgespräch — Bewerbung",
    cefr: "B1",
    category: "sitcom",
    scenario: "İş görüşmesinde kendini sunuyor.",
    transcript:
      "— Erzählen Sie mir bitte etwas über sich.\n— Ich habe in Istanbul Informatik studiert und arbeite seit drei Jahren als Webentwicklerin.\n— Warum möchten Sie zu uns kommen?\n— Weil mich Ihre Projekte im Bereich KI sehr interessieren.",
    translation:
      "— Lütfen bana kendinizden bahsedin.\n— İstanbul'da bilgisayar mühendisliği okudum ve üç yıldır web geliştirici olarak çalışıyorum.\n— Bize neden gelmek istiyorsunuz?\n— Çünkü yapay zeka projeleriniz beni çok ilgilendiriyor.",
    highlightPhrase: "Weil mich Ihre Projekte sehr interessieren.",
    vocab: [
      { word: "die Bewerbung", meaning: "iş başvurusu" },
      { word: "die Erfahrung", meaning: "deneyim" },
      { word: "sich interessieren für", meaning: "ile ilgilenmek" },
    ],
    grammarFocus: "Nebensatz mit weil (Verb am Ende).",
    watchUrl: "https://www.youtube.com/results?search_query=deutsch+vorstellungsgespraech+b1",
  },
  {
    id: "b1-wohnung",
    title: "Wohnungsbesichtigung",
    cefr: "B1",
    category: "vlog",
    scenario: "Kiralanacak daireyi geziyor.",
    transcript:
      "— Die Wohnung hat drei Zimmer und einen Balkon.\n— Wie hoch ist die Miete?\n— Achthundert Euro warm, inklusive Heizung.\n— Darf ich Haustiere halten?\n— Kleine Haustiere sind erlaubt, große leider nicht.",
    translation:
      "— Daire üç odalı ve balkonu var.\n— Kira ne kadar?\n— Sekiz yüz euro, ısıtma dahil.\n— Evcil hayvan beslenebilir mi?\n— Küçük evcil hayvanlara izin var, büyüklere ne yazık ki yok.",
    highlightPhrase: "Wie hoch ist die Miete?",
    vocab: [
      { word: "die Miete", meaning: "kira" },
      { word: "warm/kalt", meaning: "ısıtma dahil/hariç" },
      { word: "die Heizung", meaning: "kalorifer" },
      { word: "das Haustier", meaning: "evcil hayvan" },
    ],
    grammarFocus: "Modalverb dürfen + Erlaubnis.",
    watchUrl: "https://www.youtube.com/results?search_query=deutsch+wohnungsbesichtigung",
  },
  {
    id: "b2-meinung",
    title: "Diskussion — Meinung äußern",
    cefr: "B2",
    category: "comedy",
    scenario: "Bir tartışmada görüş belirtiyor.",
    transcript:
      "— Meiner Meinung nach sollte man weniger Fleisch essen.\n— Das sehe ich anders. Es kommt darauf an, woher das Fleisch stammt.\n— Trotzdem belastet die Massentierhaltung die Umwelt enorm.",
    translation:
      "— Bence daha az et yenmeli.\n— Ben farklı düşünüyorum. Etin nereden geldiğine bağlı.\n— Yine de endüstriyel hayvancılık çevreyi çok zorluyor.",
    highlightPhrase: "Meiner Meinung nach sollte man …",
    vocab: [
      { word: "die Meinung", meaning: "fikir" },
      { word: "stammen aus", meaning: "kökenli olmak" },
      { word: "die Umwelt", meaning: "çevre" },
      { word: "trotzdem", meaning: "buna rağmen" },
    ],
    grammarFocus: "Modalpartikel + Konnektoren (trotzdem, sondern, allerdings).",
    watchUrl: "https://www.youtube.com/results?search_query=easy+german+diskussion+meinung",
  },
];
