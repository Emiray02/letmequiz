/** Almanca alıştırma araçlarının ortak veri kaynağı (client-side, API gerektirmez). */

export type Article = "der" | "die" | "das";

export type ArtikelItem = {
  noun: string;
  article: Article;
  meaning: string;
  plural?: string;
  /** İpucu kuralı (Faustregel). */
  hint?: string;
};

/** En sık kullanılan 60+ A1/A2 isim. */
export const ARTIKEL_DECK: ArtikelItem[] = [
  { noun: "Mann",     article: "der", meaning: "adam",          plural: "Männer",      hint: "Erkek varlıklar genellikle der" },
  { noun: "Frau",     article: "die", meaning: "kadın",         plural: "Frauen",      hint: "Kadın varlıklar genellikle die" },
  { noun: "Kind",     article: "das", meaning: "çocuk",         plural: "Kinder",      hint: "-chen, -lein ve küçültmeler genelde das" },
  { noun: "Mädchen",  article: "das", meaning: "kız çocuk",     plural: "Mädchen",     hint: "-chen → her zaman das" },
  { noun: "Tag",      article: "der", meaning: "gün",           plural: "Tage",        hint: "Haftanın günleri ve aylar → der" },
  { noun: "Woche",    article: "die", meaning: "hafta",         plural: "Wochen",      hint: "-e ile biten birçok isim → die" },
  { noun: "Jahr",     article: "das", meaning: "yıl",           plural: "Jahre" },
  { noun: "Monat",    article: "der", meaning: "ay (takvim)",   plural: "Monate" },
  { noun: "Stadt",    article: "die", meaning: "şehir",         plural: "Städte" },
  { noun: "Land",     article: "das", meaning: "ülke",          plural: "Länder" },
  { noun: "Haus",     article: "das", meaning: "ev",            plural: "Häuser" },
  { noun: "Wohnung",  article: "die", meaning: "daire",         plural: "Wohnungen",   hint: "-ung → her zaman die" },
  { noun: "Zimmer",   article: "das", meaning: "oda",           plural: "Zimmer",      hint: "-er ile biten birçok eşya → das" },
  { noun: "Küche",    article: "die", meaning: "mutfak",        plural: "Küchen" },
  { noun: "Bad",      article: "das", meaning: "banyo",         plural: "Bäder" },
  { noun: "Tisch",    article: "der", meaning: "masa",          plural: "Tische" },
  { noun: "Stuhl",    article: "der", meaning: "sandalye",      plural: "Stühle" },
  { noun: "Bett",     article: "das", meaning: "yatak",         plural: "Betten" },
  { noun: "Tür",      article: "die", meaning: "kapı",          plural: "Türen" },
  { noun: "Fenster",  article: "das", meaning: "pencere",       plural: "Fenster" },
  { noun: "Schule",   article: "die", meaning: "okul",          plural: "Schulen" },
  { noun: "Lehrer",   article: "der", meaning: "öğretmen (e)",  plural: "Lehrer",      hint: "-er meslek → der" },
  { noun: "Lehrerin", article: "die", meaning: "öğretmen (k)",  plural: "Lehrerinnen", hint: "-in meslek dişil → die" },
  { noun: "Schüler",  article: "der", meaning: "öğrenci (e)",   plural: "Schüler" },
  { noun: "Buch",     article: "das", meaning: "kitap",         plural: "Bücher" },
  { noun: "Heft",     article: "das", meaning: "defter",        plural: "Hefte" },
  { noun: "Stift",    article: "der", meaning: "kalem",         plural: "Stifte" },
  { noun: "Tasche",   article: "die", meaning: "çanta",         plural: "Taschen" },
  { noun: "Auto",     article: "das", meaning: "araba",         plural: "Autos" },
  { noun: "Bus",      article: "der", meaning: "otobüs",        plural: "Busse" },
  { noun: "Zug",      article: "der", meaning: "tren",          plural: "Züge" },
  { noun: "Bahnhof",  article: "der", meaning: "tren istasyonu",plural: "Bahnhöfe" },
  { noun: "Flughafen",article: "der", meaning: "havalimanı",    plural: "Flughäfen" },
  { noun: "Brücke",   article: "die", meaning: "köprü",         plural: "Brücken" },
  { noun: "Straße",   article: "die", meaning: "cadde",         plural: "Straßen" },
  { noun: "Park",     article: "der", meaning: "park",          plural: "Parks" },
  { noun: "Restaurant",article: "das", meaning: "restoran",     plural: "Restaurants" },
  { noun: "Café",     article: "das", meaning: "kafe",          plural: "Cafés" },
  { noun: "Hotel",    article: "das", meaning: "otel",          plural: "Hotels" },
  { noun: "Markt",    article: "der", meaning: "pazar",         plural: "Märkte" },
  { noun: "Supermarkt",article: "der", meaning: "süpermarket",  plural: "Supermärkte" },
  { noun: "Bäckerei", article: "die", meaning: "fırın",         plural: "Bäckereien",  hint: "-ei → her zaman die" },
  { noun: "Apotheke", article: "die", meaning: "eczane",        plural: "Apotheken" },
  { noun: "Krankenhaus",article: "das",meaning: "hastane",      plural: "Krankenhäuser" },
  { noun: "Arzt",     article: "der", meaning: "doktor (e)",    plural: "Ärzte" },
  { noun: "Ärztin",   article: "die", meaning: "doktor (k)",    plural: "Ärztinnen" },
  { noun: "Arbeit",   article: "die", meaning: "iş, çalışma",   plural: "Arbeiten" },
  { noun: "Beruf",    article: "der", meaning: "meslek",        plural: "Berufe" },
  { noun: "Geld",     article: "das", meaning: "para",          plural: "—" },
  { noun: "Zeit",     article: "die", meaning: "zaman",         plural: "Zeiten" },
  { noun: "Uhr",      article: "die", meaning: "saat",          plural: "Uhren" },
  { noun: "Telefon",  article: "das", meaning: "telefon",       plural: "Telefone" },
  { noun: "Computer", article: "der", meaning: "bilgisayar",    plural: "Computer" },
  { noun: "Handy",    article: "das", meaning: "cep telefonu",  plural: "Handys" },
  { noun: "Internet", article: "das", meaning: "internet",      plural: "—" },
  { noun: "E-Mail",   article: "die", meaning: "e-posta",       plural: "E-Mails" },
  { noun: "Frage",    article: "die", meaning: "soru",          plural: "Fragen" },
  { noun: "Antwort",  article: "die", meaning: "cevap",         plural: "Antworten" },
  { noun: "Wort",     article: "das", meaning: "kelime",        plural: "Wörter" },
  { noun: "Satz",     article: "der", meaning: "cümle",         plural: "Sätze" },
  { noun: "Sprache",  article: "die", meaning: "dil",           plural: "Sprachen" },
  { noun: "Freundschaft",article: "die",meaning: "dostluk",     plural: "Freundschaften", hint: "-schaft → her zaman die" },
  { noun: "Möglichkeit",article: "die",meaning: "olanak",       plural: "Möglichkeiten",  hint: "-keit / -heit → her zaman die" },
];

/** Genel ipuçları (Faustregeln). */
export const ARTIKEL_RULES = [
  { article: "der" as Article, items: [
    "Erkek kişiler ve hayvanlar (der Vater, der Hund)",
    "Haftanın günleri, aylar, mevsimler (der Montag, der Mai)",
    "-er ile biten meslek/eylem ismi (der Lehrer, der Computer)",
    "Hava olayları (der Regen, der Schnee)",
  ]},
  { article: "die" as Article, items: [
    "Kadın kişiler (die Mutter, die Frau)",
    "-ung, -heit, -keit, -schaft, -ion, -tät, -ei → her zaman die",
    "-e ile biten birçok isim (die Lampe, die Blume)",
    "Sayı isimleri (die Eins, die Million)",
  ]},
  { article: "das" as Article, items: [
    "-chen ve -lein ile küçültmeler (das Mädchen, das Tischlein)",
    "Mastar isimler (das Lernen, das Essen)",
    "Renkler ve diller (das Rot, das Deutsch)",
    "-ment, -tum, -um eki olan birçok isim",
  ]},
];

/* =====================================================================
   Verb Trainer — Präsens
   ===================================================================== */

export type Pronoun = "ich" | "du" | "er" | "wir" | "ihr" | "sie";

export const PRONOUN_LABEL: Record<Pronoun, string> = {
  ich: "ich",
  du: "du",
  er: "er/sie/es",
  wir: "wir",
  ihr: "ihr",
  sie: "sie/Sie",
};

export type VerbEntry = {
  infinitive: string;
  meaning: string;
  type: "düzenli" | "düzensiz" | "modal" | "yardımcı";
  forms: Record<Pronoun, string>;
};

export const VERB_DECK: VerbEntry[] = [
  {
    infinitive: "sein", meaning: "olmak", type: "yardımcı",
    forms: { ich: "bin", du: "bist", er: "ist", wir: "sind", ihr: "seid", sie: "sind" },
  },
  {
    infinitive: "haben", meaning: "sahip olmak", type: "yardımcı",
    forms: { ich: "habe", du: "hast", er: "hat", wir: "haben", ihr: "habt", sie: "haben" },
  },
  {
    infinitive: "werden", meaning: "olmak (gelecek/edilgen)", type: "yardımcı",
    forms: { ich: "werde", du: "wirst", er: "wird", wir: "werden", ihr: "werdet", sie: "werden" },
  },
  {
    infinitive: "können", meaning: "yapabilmek", type: "modal",
    forms: { ich: "kann", du: "kannst", er: "kann", wir: "können", ihr: "könnt", sie: "können" },
  },
  {
    infinitive: "müssen", meaning: "zorunda olmak", type: "modal",
    forms: { ich: "muss", du: "musst", er: "muss", wir: "müssen", ihr: "müsst", sie: "müssen" },
  },
  {
    infinitive: "dürfen", meaning: "izin var olmak", type: "modal",
    forms: { ich: "darf", du: "darfst", er: "darf", wir: "dürfen", ihr: "dürft", sie: "dürfen" },
  },
  {
    infinitive: "wollen", meaning: "istemek (kararlı)", type: "modal",
    forms: { ich: "will", du: "willst", er: "will", wir: "wollen", ihr: "wollt", sie: "wollen" },
  },
  {
    infinitive: "sollen", meaning: "yapmalı (öneri)", type: "modal",
    forms: { ich: "soll", du: "sollst", er: "soll", wir: "sollen", ihr: "sollt", sie: "sollen" },
  },
  {
    infinitive: "mögen", meaning: "sevmek / hoşlanmak", type: "modal",
    forms: { ich: "mag", du: "magst", er: "mag", wir: "mögen", ihr: "mögt", sie: "mögen" },
  },
  {
    infinitive: "lernen", meaning: "öğrenmek", type: "düzenli",
    forms: { ich: "lerne", du: "lernst", er: "lernt", wir: "lernen", ihr: "lernt", sie: "lernen" },
  },
  {
    infinitive: "machen", meaning: "yapmak", type: "düzenli",
    forms: { ich: "mache", du: "machst", er: "macht", wir: "machen", ihr: "macht", sie: "machen" },
  },
  {
    infinitive: "wohnen", meaning: "ikamet etmek", type: "düzenli",
    forms: { ich: "wohne", du: "wohnst", er: "wohnt", wir: "wohnen", ihr: "wohnt", sie: "wohnen" },
  },
  {
    infinitive: "arbeiten", meaning: "çalışmak", type: "düzenli",
    forms: { ich: "arbeite", du: "arbeitest", er: "arbeitet", wir: "arbeiten", ihr: "arbeitet", sie: "arbeiten" },
  },
  {
    infinitive: "sprechen", meaning: "konuşmak", type: "düzensiz",
    forms: { ich: "spreche", du: "sprichst", er: "spricht", wir: "sprechen", ihr: "sprecht", sie: "sprechen" },
  },
  {
    infinitive: "lesen", meaning: "okumak", type: "düzensiz",
    forms: { ich: "lese", du: "liest", er: "liest", wir: "lesen", ihr: "lest", sie: "lesen" },
  },
  {
    infinitive: "fahren", meaning: "(araçla) gitmek", type: "düzensiz",
    forms: { ich: "fahre", du: "fährst", er: "fährt", wir: "fahren", ihr: "fahrt", sie: "fahren" },
  },
  {
    infinitive: "essen", meaning: "yemek", type: "düzensiz",
    forms: { ich: "esse", du: "isst", er: "isst", wir: "essen", ihr: "esst", sie: "essen" },
  },
  {
    infinitive: "geben", meaning: "vermek", type: "düzensiz",
    forms: { ich: "gebe", du: "gibst", er: "gibt", wir: "geben", ihr: "gebt", sie: "geben" },
  },
  {
    infinitive: "nehmen", meaning: "almak", type: "düzensiz",
    forms: { ich: "nehme", du: "nimmst", er: "nimmt", wir: "nehmen", ihr: "nehmt", sie: "nehmen" },
  },
  {
    infinitive: "schlafen", meaning: "uyumak", type: "düzensiz",
    forms: { ich: "schlafe", du: "schläfst", er: "schläft", wir: "schlafen", ihr: "schlaft", sie: "schlafen" },
  },
];

/* =====================================================================
   Diktat (dinleme yazma) — kısa cümleler.
   Browser SpeechSynthesis (de-DE) ile seslendirilir.
   ===================================================================== */

export type DiktatItem = {
  text: string;
  level: "A1" | "A2" | "B1";
  hint?: string;
};

export const DIKTAT_DECK: DiktatItem[] = [
  { level: "A1", text: "Ich heiße Max und ich komme aus Berlin." },
  { level: "A1", text: "Wie spät ist es jetzt?" },
  { level: "A1", text: "Meine Adresse ist Goethestraße zwölf." },
  { level: "A1", text: "Wir wohnen in einer großen Stadt." },
  { level: "A1", text: "Heute ist Montag und morgen ist Dienstag." },
  { level: "A2", text: "Ich möchte einen Termin beim Arzt vereinbaren." },
  { level: "A2", text: "Können Sie das bitte langsamer wiederholen?" },
  { level: "A2", text: "Mein Bruder arbeitet seit drei Jahren in München." },
  { level: "A2", text: "Am Wochenende fahren wir oft mit dem Zug ans Meer." },
  { level: "A2", text: "Entschuldigung, wo finde ich den nächsten Geldautomaten?" },
  { level: "B1", text: "Ich habe mich für die Stelle als Verkäuferin beworben." },
  { level: "B1", text: "Obwohl es regnet, gehen wir spazieren." },
  { level: "B1", text: "Wenn ich Zeit hätte, würde ich öfter ins Kino gehen." },
  { level: "B1", text: "Die Frist für die Anmeldung läuft am Freitag ab." },
];

/* =====================================================================
   Sätze bauen — kelimelerden cümle kurma alıştırması.
   ===================================================================== */

export type SentenceItem = {
  level: "A1" | "A2" | "B1";
  /** Doğru sıralanmış cümle. */
  sentence: string;
  /** Karıştırılacak parçalar (boşluk veya virgülle bölünmüş). */
  parts: string[];
  translation: string;
};

export const SENTENCE_DECK: SentenceItem[] = [
  {
    level: "A1",
    sentence: "Ich lerne jeden Tag Deutsch.",
    parts: ["Ich", "lerne", "jeden Tag", "Deutsch"],
    translation: "Her gün Almanca öğreniyorum.",
  },
  {
    level: "A1",
    sentence: "Wir wohnen seit zwei Jahren in Hamburg.",
    parts: ["Wir", "wohnen", "seit zwei Jahren", "in Hamburg"],
    translation: "İki yıldır Hamburg’da oturuyoruz.",
  },
  {
    level: "A2",
    sentence: "Am Wochenende möchte ich ins Kino gehen.",
    parts: ["Am Wochenende", "möchte", "ich", "ins Kino", "gehen"],
    translation: "Hafta sonu sinemaya gitmek istiyorum.",
  },
  {
    level: "A2",
    sentence: "Können Sie mir bitte den Weg zum Bahnhof erklären?",
    parts: ["Können", "Sie", "mir", "bitte", "den Weg", "zum Bahnhof", "erklären"],
    translation: "Bana istasyona giden yolu anlatabilir misiniz?",
  },
  {
    level: "B1",
    sentence: "Wenn das Wetter schön ist, fahren wir ans Meer.",
    parts: ["Wenn", "das Wetter", "schön ist,", "fahren", "wir", "ans Meer"],
    translation: "Hava güzel olursa denize gideriz.",
  },
];
