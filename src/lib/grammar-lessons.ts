/**
 * German grammar lessons (A1–B1).
 *
 * Content reflects standard, widely-documented German grammar as taught by
 * Duden-Grammatik, Goethe-Institut A1–B1 syllabi, Deutsche Welle "Nicos Weg",
 * and DWDS dictionary entries. Tables (declensions, conjugations, prepositions)
 * are canonical and verifiable. Each lesson cites its primary references.
 */

export type LessonBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "examples"; items: { de: string; tr: string }[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "tip"; text: string }
  | { type: "warn"; text: string }
  | { type: "note"; text: string };

export type Lesson = {
  slug: string;
  title: string;
  subtitle: string;
  level: "A1" | "A2" | "B1";
  minutes: number;
  emoji: string;
  blocks: LessonBlock[];
  sources: { label: string; url: string }[];
};

const SRC = {
  duden:   { label: "Duden — Sprachwissen", url: "https://www.duden.de/sprachwissen" },
  goethe:  { label: "Goethe-Institut — Deutsch lernen", url: "https://www.goethe.de/de/spr/ueb.html" },
  dw:      { label: "Deutsche Welle — Deutsch lernen", url: "https://learngerman.dw.com/" },
  dwds:    { label: "DWDS — Digitales Wörterbuch", url: "https://www.dwds.de/" },
  canoo:   { label: "Mein-deutschbuch.de — Grammatik", url: "https://mein-deutschbuch.de/grammatik.html" },
};

export const LESSONS: Lesson[] = [
  {
    slug: "artikel-bestimmt",
    title: "Bestimmter Artikel: der · die · das",
    subtitle: "Belirli artikel — Türkçedeki sıfır karşılığıyla yola çıkalım.",
    level: "A1",
    minutes: 6,
    emoji: "🪪",
    blocks: [
      { type: "p", text: "Almancada her isim bir cinsiyet (Genus) taşır: maskulin, feminin veya neutrum. Belirli artikel cinsiyete + duruma (Kasus) + sayıya (Singular/Plural) göre değişir." },
      { type: "h", text: "Singular ve Plural — 4 hâl tablosu" },
      {
        type: "table",
        headers: ["Kasus", "Maskulin", "Feminin", "Neutrum", "Plural"],
        rows: [
          ["Nominativ (özne)",  "der", "die", "das", "die"],
          ["Akkusativ (-i hâli)", "den", "die", "das", "die"],
          ["Dativ (-e/-de hâli)", "dem", "der", "dem", "den"],
          ["Genitiv (-in hâli)",  "des", "der", "des", "der"],
        ],
      },
      { type: "tip", text: "Sadece maskulin ve sadece dativ-plural değişir; gerisini bir kez ezberleyince çok kolaylaşır." },
      { type: "h", text: "Örnekler" },
      {
        type: "examples",
        items: [
          { de: "Der Lehrer kommt.",            tr: "Öğretmen geliyor. (Nominativ — özne)" },
          { de: "Ich sehe den Lehrer.",          tr: "Öğretmeni görüyorum. (Akkusativ)" },
          { de: "Ich helfe dem Lehrer.",         tr: "Öğretmene yardım ediyorum. (Dativ)" },
          { de: "Das Buch des Lehrers ist neu.", tr: "Öğretmenin kitabı yeni. (Genitiv)" },
        ],
      },
      { type: "h", text: "Cinsiyet için ipuçları" },
      { type: "list", items: [
        "-ung, -heit, -keit, -schaft, -ion, -ie ile bitenler genelde feminin: die Übung, die Freiheit, die Information.",
        "-er (kişi) genelde maskulin: der Lehrer, der Bäcker.",
        "Küçültme ekleri -chen ve -lein ise her zaman neutrum: das Mädchen, das Häuschen.",
      ]},
      { type: "warn", text: "İstisnalar var. Yeni bir kelime öğrenirken artikeli mutlaka birlikte ezberle (örnek: 'das Mädchen', 'die Sonne')." },
    ],
    sources: [SRC.duden, SRC.goethe, SRC.dwds],
  },

  {
    slug: "artikel-unbestimmt",
    title: "Belirsiz artikel: ein · eine + kein",
    subtitle: "İlk kez bahsedilen şeyler ve olumsuzluk yapısı.",
    level: "A1",
    minutes: 5,
    emoji: "❓",
    blocks: [
      { type: "p", text: "Bir şeyden ilk kez bahsederken belirsiz artikel kullanırız: ein/eine. Çoğulda belirsiz artikel yoktur (sıfır artikel). Olumsuz için 'kein-' kullanılır." },
      { type: "h", text: "ein- / kein- tablosu" },
      {
        type: "table",
        headers: ["Kasus", "Maskulin", "Feminin", "Neutrum", "Plural (sadece kein)"],
        rows: [
          ["Nominativ", "ein / kein",       "eine / keine",   "ein / kein",       "— / keine"],
          ["Akkusativ", "einen / keinen",    "eine / keine",   "ein / kein",       "— / keine"],
          ["Dativ",      "einem / keinem",   "einer / keiner", "einem / keinem",   "— / keinen + n"],
          ["Genitiv",    "eines / keines",   "einer / keiner", "eines / keines",   "— / keiner"],
        ],
      },
      { type: "note", text: "Possesiv artikeller (mein, dein, sein, ihr, unser, euer, ihr/Ihr) tam olarak 'kein' gibi çekilir." },
      { type: "h", text: "nicht mi, kein mi?" },
      { type: "list", items: [
        "İsmi (artikelsiz veya 'ein' ile) olumsuzluyorsan → kein: 'Ich habe kein Auto.'",
        "Fiili, sıfatı, zarfı veya belirli artikelli ismi olumsuzluyorsan → nicht: 'Ich komme nicht.', 'Das ist nicht das Buch.'",
      ]},
      { type: "examples", items: [
        { de: "Ich habe einen Bruder.",     tr: "Bir erkek kardeşim var." },
        { de: "Ich habe keinen Bruder.",    tr: "Erkek kardeşim yok." },
        { de: "Sie isst keine Pizza.",       tr: "O (kadın) pizza yemiyor." },
        { de: "Wir kaufen keine Bücher.",   tr: "Kitap satın almıyoruz." },
      ]},
    ],
    sources: [SRC.duden, SRC.dw],
  },

  {
    slug: "praesens-konjugation",
    title: "Präsens — düzenli fiil çekimi",
    subtitle: "Şahıs ekleri ve 'du/er' için ses uyumu.",
    level: "A1",
    minutes: 6,
    emoji: "🔁",
    blocks: [
      { type: "p", text: "Mastar (Infinitiv) genelde -en ile biter: lernen, machen, spielen. Köke (Stamm) şahıs ekleri eklenir." },
      {
        type: "table",
        headers: ["Şahıs", "Ek", "lernen"],
        rows: [
          ["ich",            "-e",   "ich lerne"],
          ["du",              "-st",  "du lernst"],
          ["er / sie / es",  "-t",   "er lernt"],
          ["wir",             "-en",  "wir lernen"],
          ["ihr",             "-t",   "ihr lernt"],
          ["sie / Sie",       "-en",  "sie lernen"],
        ],
      },
      { type: "h", text: "Yardımcı ses 'e' (Bindevokal)" },
      { type: "p", text: "Kök -t, -d, -chn, -ffn ile biterse 'du/er/ihr' formlarında telaffuzu kolaylaştırmak için 'e' eklenir." },
      { type: "examples", items: [
        { de: "arbeiten → du arbeitest, er arbeitet, ihr arbeitet", tr: "çalışmak" },
        { de: "finden → du findest, er findet, ihr findet",         tr: "bulmak" },
        { de: "öffnen → du öffnest, er öffnet, ihr öffnet",         tr: "açmak" },
      ]},
      { type: "h", text: "-s, -ß, -z, -x ile biten kökler" },
      { type: "p", text: "'du' formunda -st yerine sadece -t eklenir (kök zaten s-sesiyle bitiyor):" },
      { type: "examples", items: [
        { de: "heißen → du heißt", tr: "adın olmak" },
        { de: "tanzen → du tanzt", tr: "dans etmek" },
        { de: "reisen → du reist", tr: "seyahat etmek" },
      ]},
      { type: "warn", text: "Düzensiz fiillerde (sehen, geben, fahren, lesen…) 'du/er/sie/es' formunda kök sesli harfi değişir: ich sehe → du siehst, er sieht. Bunlar tek tek öğrenilir." },
    ],
    sources: [SRC.duden, SRC.canoo, SRC.dw],
  },

  {
    slug: "sein-haben",
    title: "sein ve haben — iki temel fiil",
    subtitle: "Hem yardımcı (Perfekt) hem de bağımsız fiil.",
    level: "A1",
    minutes: 5,
    emoji: "🧱",
    blocks: [
      { type: "p", text: "'sein' (olmak) ve 'haben' (sahip olmak) Almancanın iki en sık fiilidir; ayrıca Perfekt zamanını kurmak için yardımcı fiildir." },
      {
        type: "table",
        headers: ["Şahıs", "sein", "haben"],
        rows: [
          ["ich",            "bin",   "habe"],
          ["du",              "bist",  "hast"],
          ["er / sie / es",  "ist",   "hat"],
          ["wir",             "sind",  "haben"],
          ["ihr",             "seid",  "habt"],
          ["sie / Sie",       "sind",  "haben"],
        ],
      },
      { type: "examples", items: [
        { de: "Ich bin müde.",        tr: "Yorgunum." },
        { de: "Du bist Lehrer.",      tr: "Sen öğretmensin." },
        { de: "Wir haben Hunger.",    tr: "Açız." },
        { de: "Sie hat ein Auto.",    tr: "Onun (kadın) bir arabası var." },
      ]},
      { type: "tip", text: "Perfekt'te hareket veya durum değişimi anlatan fiiller 'sein' ile çekilir: gehen → ich bin gegangen. Diğerleri 'haben' alır: machen → ich habe gemacht." },
      { type: "h", text: "Präteritum (yazı dilinde sık)" },
      {
        type: "table",
        headers: ["Şahıs", "sein → war", "haben → hatte"],
        rows: [
          ["ich",      "war",    "hatte"],
          ["du",       "warst",  "hattest"],
          ["er/sie/es","war",    "hatte"],
          ["wir",      "waren",  "hatten"],
          ["ihr",      "wart",   "hattet"],
          ["sie/Sie",  "waren",  "hatten"],
        ],
      },
    ],
    sources: [SRC.dwds, SRC.duden],
  },

  {
    slug: "modalverben",
    title: "Modalverben — können, müssen, wollen, sollen, dürfen, mögen",
    subtitle: "İkinci fiil sona, mastar hâlinde gider.",
    level: "A1",
    minutes: 7,
    emoji: "🛂",
    blocks: [
      { type: "p", text: "Modalverbler, ana fiile anlam katar (yetenek, zorunluluk, izin, istek). Cümlede modal fiil çekilir, asıl fiil mastar hâlde cümlenin sonuna gider." },
      {
        type: "table",
        headers: ["Şahıs", "können", "müssen", "wollen", "sollen", "dürfen", "mögen"],
        rows: [
          ["ich",            "kann",  "muss",  "will",  "soll",  "darf",  "mag"],
          ["du",              "kannst","musst", "willst","sollst","darfst","magst"],
          ["er / sie / es",  "kann",  "muss",  "will",  "soll",  "darf",  "mag"],
          ["wir",             "können","müssen","wollen","sollen","dürfen","mögen"],
          ["ihr",             "könnt", "müsst", "wollt", "sollt", "dürft", "mögt"],
          ["sie / Sie",       "können","müssen","wollen","sollen","dürfen","mögen"],
        ],
      },
      { type: "warn", text: "Tekil formlarda (ich/er) ek YOKTUR. 'Ich kann' (✓), 'Ich kanne' (✗)." },
      { type: "h", text: "Cümle yapısı" },
      { type: "examples", items: [
        { de: "Ich kann gut Deutsch sprechen.", tr: "İyi Almanca konuşabilirim." },
        { de: "Du musst jetzt schlafen.",        tr: "Şimdi uyumalısın." },
        { de: "Wir wollen ins Kino gehen.",     tr: "Sinemaya gitmek istiyoruz." },
        { de: "Darf ich hier rauchen?",          tr: "Burada sigara içebilir miyim?" },
      ]},
      { type: "h", text: "Anlam ayrımı" },
      { type: "list", items: [
        "können → yetenek / olasılık (yapabilirim)",
        "müssen → zorunluluk (yapmak zorundayım)",
        "wollen → güçlü istek / niyet (yapmak istiyorum)",
        "sollen → başkasının dediği / öneri (yapmalıyım)",
        "dürfen → izin (yapmama izin var)",
        "mögen / möchten → hoşlanma / kibar istek ('möchte' resmi sipariş için)",
      ]},
      { type: "tip", text: "'möchten' aslında 'mögen' fiilinin Konjunktiv II hâlidir. Restoran/sipariş gibi kibar isteklerde 'will' yerine 'möchte' kullanırız: 'Ich möchte einen Kaffee, bitte.'" },
    ],
    sources: [SRC.duden, SRC.goethe, SRC.dw],
  },

  {
    slug: "akkusativ",
    title: "Akkusativ — '-i' hâli",
    subtitle: "Doğrudan nesneyi işaretleyen durum.",
    level: "A1",
    minutes: 5,
    emoji: "🎯",
    blocks: [
      { type: "p", text: "Akkusativ, fiilin doğrudan nesnesini gösterir: 'Ben kitabı okuyorum' → 'Ich lese das Buch.' Sadece maskulin tekil artikel değişir (der → den, ein → einen)." },
      {
        type: "table",
        headers: ["", "Mask.", "Fem.", "Neut.", "Plural"],
        rows: [
          ["Bestimmt", "den", "die", "das", "die"],
          ["Unbestimmt", "einen", "eine", "ein", "—"],
          ["Negation", "keinen", "keine", "kein", "keine"],
        ],
      },
      { type: "h", text: "Akkusativ alan tipik fiiller" },
      { type: "list", items: [
        "haben (-e sahip olmak)", "kaufen (satın almak)", "nehmen (almak)",
        "sehen (görmek)", "hören (duymak)", "lesen (okumak)",
        "essen (yemek)", "trinken (içmek)", "brauchen (ihtiyacı olmak)",
        "möchten / wollen", "lieben (sevmek)", "kennen (tanımak)",
      ]},
      { type: "h", text: "Akkusativ alan edatlar" },
      { type: "p", text: "Şu edatlar daima akkusativ ister: durch, für, gegen, ohne, um, bis, entlang." },
      { type: "examples", items: [
        { de: "Ich habe einen Hund.",          tr: "Bir köpeğim var." },
        { de: "Sie kauft den Apfel.",          tr: "O elmayı satın alıyor." },
        { de: "Das Geschenk ist für meinen Vater.", tr: "Hediye babam için." },
        { de: "Wir gehen durch den Park.",     tr: "Parkın içinden geçiyoruz." },
      ]},
    ],
    sources: [SRC.duden, SRC.canoo],
  },

  {
    slug: "dativ",
    title: "Dativ — '-e' / '-de' hâli",
    subtitle: "Dolaylı nesne, alıcı, yer.",
    level: "A1",
    minutes: 6,
    emoji: "📨",
    blocks: [
      { type: "p", text: "Dativ; alıcıyı, yararlananı veya yeri (içinde/üzerinde) gösterir. 'Wem?' (kime?) sorusunun cevabıdır." },
      {
        type: "table",
        headers: ["", "Mask.", "Fem.", "Neut.", "Plural"],
        rows: [
          ["Bestimmt", "dem", "der", "dem", "den + n"],
          ["Unbestimmt", "einem", "einer", "einem", "— + n"],
          ["Negation", "keinem", "keiner", "keinem", "keinen + n"],
        ],
      },
      { type: "warn", text: "Dativ-pluralda hem artikel '-en' alır hem de ismin sonuna -n eklenir (ismin -n veya -s ile bitmediği durumlarda): 'mit den Kindern', 'mit den Freunden'." },
      { type: "h", text: "Sadece dativ alan fiiller (önemli liste)" },
      { type: "list", items: [
        "helfen (yardım etmek)", "danken (teşekkür etmek)",
        "antworten (cevap vermek)", "gefallen (hoşuna gitmek)",
        "gehören (-e ait olmak)", "passen (uymak)",
        "schmecken (tadı hoşuna gitmek)", "folgen (takip etmek)",
        "glauben (inanmak — kişiye)", "gratulieren (kutlamak)",
      ]},
      { type: "h", text: "Dativ alan edatlar (her zaman)" },
      { type: "p", text: "aus, bei, mit, nach, seit, von, zu, gegenüber, ab." },
      { type: "examples", items: [
        { de: "Ich helfe dem Kind.",            tr: "Çocuğa yardım ediyorum." },
        { de: "Das Buch gehört meiner Mutter.", tr: "Kitap anneme ait." },
        { de: "Wir fahren mit dem Bus.",        tr: "Otobüsle gidiyoruz." },
        { de: "Sie wohnt bei ihren Eltern.",    tr: "Anne-babasının yanında yaşıyor." },
      ]},
    ],
    sources: [SRC.duden, SRC.dw, SRC.canoo],
  },

  {
    slug: "wechselpraepositionen",
    title: "Wechselpräpositionen — yer mi, yön mü?",
    subtitle: "9 edat: bazen Akkusativ, bazen Dativ.",
    level: "A2",
    minutes: 6,
    emoji: "🔀",
    blocks: [
      { type: "p", text: "Şu 9 edat hem Akkusativ hem Dativ alabilir — anlam belirler:" },
      { type: "list", items: ["an", "auf", "hinter", "in", "neben", "über", "unter", "vor", "zwischen"] },
      { type: "h", text: "Kural" },
      { type: "list", items: [
        "Wohin? (nereye? — yön / hareket) → Akkusativ",
        "Wo? (nerede? — yer / durum) → Dativ",
      ]},
      {
        type: "table",
        headers: ["Soru", "Örnek", "Edat + Kasus"],
        rows: [
          ["Wohin?", "Ich gehe in die Schule.",   "in + Akk."],
          ["Wo?",    "Ich bin in der Schule.",     "in + Dat."],
          ["Wohin?", "Er stellt das Glas auf den Tisch.", "auf + Akk."],
          ["Wo?",    "Das Glas steht auf dem Tisch.",     "auf + Dat."],
        ],
      },
      { type: "tip", text: "İpucu: 'stellen/legen/setzen/hängen' (yön — Akkusativ); 'stehen/liegen/sitzen/hängen' (durum — Dativ)." },
      { type: "h", text: "Sık kullanılan kaynaşmalar" },
      { type: "list", items: [
        "in + dem → im   (im Kino)",
        "in + das → ins  (ins Kino)",
        "an + dem → am   (am Bahnhof)",
        "an + das → ans  (ans Meer)",
      ]},
    ],
    sources: [SRC.duden, SRC.dw, SRC.canoo],
  },

  {
    slug: "trennbare-verben",
    title: "Trennbare Verben — ayrılabilir fiiller",
    subtitle: "Önek cümle sonuna fırlar.",
    level: "A1",
    minutes: 5,
    emoji: "🪃",
    blocks: [
      { type: "p", text: "Bazı fiiller bir önek + ana fiilden oluşur: aufstehen, einkaufen, mitkommen. Düz cümlede önek ayrılır ve cümlenin sonuna gider." },
      { type: "h", text: "Vurgu kuralı" },
      { type: "p", text: "Sözlükte vurgu önekteyse fiil ayrılır: ˈaufstehen → ich stehe auf. Vurgu kökteyse ayrılmaz: beˈsuchen → ich besuche." },
      { type: "h", text: "Sık ayrılabilir önekler" },
      { type: "list", items: ["ab-, an-, auf-, aus-, ein-, mit-, nach-, vor-, weg-, zu-, zurück-"] },
      { type: "h", text: "Sık ayrılmayan önekler" },
      { type: "list", items: ["be-, ge-, er-, ver-, zer-, ent-, emp-, miss-"] },
      { type: "examples", items: [
        { de: "Ich stehe um 7 Uhr auf.",         tr: "Saat 7'de kalkıyorum." },
        { de: "Wir kaufen am Samstag ein.",       tr: "Cumartesi alışveriş yapıyoruz." },
        { de: "Kommst du heute mit?",             tr: "Bugün geliyor musun (yanımıza)?" },
        { de: "Er besucht seine Oma.",            tr: "(ayrılmaz) Büyükannesini ziyaret ediyor." },
      ]},
      { type: "warn", text: "Yan cümlede (weil, dass…) ayrılmaz; fiil bir bütün hâlinde sona gider: '..., weil ich um 7 Uhr aufstehe.'" },
    ],
    sources: [SRC.duden, SRC.canoo, SRC.dw],
  },

  {
    slug: "perfekt",
    title: "Perfekt — geçmiş zaman (konuşma dili)",
    subtitle: "haben / sein + Partizip II",
    level: "A1",
    minutes: 7,
    emoji: "⏪",
    blocks: [
      { type: "p", text: "Almanca konuşma dilinde geçmiş için Perfekt kullanılır: yardımcı fiil (haben veya sein) çekilir + Partizip II cümle sonuna gider." },
      { type: "h", text: "Partizip II oluşumu" },
      {
        type: "table",
        headers: ["Tip", "Örnek mastar", "Partizip II"],
        rows: [
          ["Düzenli (schwach)",       "machen",      "ge·mach·t"],
          ["Düzensiz (stark)",        "sehen",       "ge·sehen"],
          ["Ayrılabilir önekli",      "aufstehen",   "auf·ge·stand·en"],
          ["Ayrılmayan önekli",       "besuchen",    "besucht (ge yok!)"],
          ["-ieren ile biten",        "studieren",   "studiert (ge yok!)"],
        ],
      },
      { type: "h", text: "haben mı, sein mi?" },
      { type: "p", text: "Çoğu fiil haben alır. SEIN alanlar:" },
      { type: "list", items: [
        "Hareket / yer değişimi: gehen, fahren, kommen, fliegen, laufen, reisen.",
        "Durum değişimi: aufstehen, einschlafen, sterben, werden, wachsen.",
        "Üç istisna: sein → ist gewesen, bleiben → ist geblieben, passieren/geschehen → ist passiert/geschehen.",
      ]},
      { type: "examples", items: [
        { de: "Ich habe Deutsch gelernt.",       tr: "Almanca öğrendim." },
        { de: "Wir haben einen Film gesehen.",    tr: "Bir film izledik." },
        { de: "Sie ist nach Berlin gefahren.",    tr: "O Berlin'e gitti." },
        { de: "Er ist um 6 Uhr aufgestanden.",    tr: "O 6'da kalktı." },
        { de: "Wir haben das Hotel reserviert.", tr: "(-ieren) Oteli rezerve ettik." },
      ]},
      { type: "tip", text: "Yardımcı fiil 2. pozisyonda, Partizip II ise daima cümlenin SONUNDA olur." },
    ],
    sources: [SRC.duden, SRC.dw, SRC.canoo],
  },

  {
    slug: "adjektivdeklination",
    title: "Sıfat çekimi (Adjektivdeklination)",
    subtitle: "Üç tablo: belirli, belirsiz ve artikelsiz.",
    level: "A2",
    minutes: 8,
    emoji: "🎨",
    blocks: [
      { type: "p", text: "Bir sıfat ismin önündeyse çekilir. Hangi tablonun kullanılacağı, sıfatın önünde hangi tür artikel olduğuna bağlıdır." },
      { type: "h", text: "1) Belirli artikelden sonra (der/die/das, dieser, jeder...)" },
      {
        type: "table",
        headers: ["", "Mask.", "Fem.", "Neut.", "Plural"],
        rows: [
          ["Nominativ", "-e",  "-e",  "-e",  "-en"],
          ["Akkusativ", "-en", "-e",  "-e",  "-en"],
          ["Dativ",      "-en", "-en", "-en", "-en"],
          ["Genitiv",    "-en", "-en", "-en", "-en"],
        ],
      },
      { type: "h", text: "2) Belirsiz artikelden sonra (ein/kein/mein...)" },
      {
        type: "table",
        headers: ["", "Mask.", "Fem.", "Neut.", "Plural"],
        rows: [
          ["Nominativ", "-er", "-e",  "-es", "-en"],
          ["Akkusativ", "-en", "-e",  "-es", "-en"],
          ["Dativ",      "-en", "-en", "-en", "-en"],
          ["Genitiv",    "-en", "-en", "-en", "-en"],
        ],
      },
      { type: "h", text: "3) Artikelsiz (Nullartikel)" },
      {
        type: "table",
        headers: ["", "Mask.", "Fem.", "Neut.", "Plural"],
        rows: [
          ["Nominativ", "-er", "-e",  "-es", "-e"],
          ["Akkusativ", "-en", "-e",  "-es", "-e"],
          ["Dativ",      "-em", "-er", "-em", "-en"],
          ["Genitiv",    "-en", "-er", "-en", "-er"],
        ],
      },
      { type: "examples", items: [
        { de: "der schöne Garten / einen schönen Garten / schöner Garten", tr: "güzel bahçe — üç tablonun mantığı" },
        { de: "Ich trinke heißen Kaffee.",         tr: "(artikelsiz, mask. Akk.) Sıcak kahve içiyorum." },
        { de: "Mit dem neuen Auto fahre ich.",     tr: "(belirli, neut. Dat.) Yeni arabayla gidiyorum." },
        { de: "Sie kauft eine rote Tasche.",       tr: "(belirsiz, fem. Akk.) Kırmızı bir çanta alıyor." },
      ]},
      { type: "tip", text: "Genel kural: Eğer artikel kasus/cinsiyeti zaten belli ediyorsa sıfat 'zayıf' (-e/-en) çekilir. Belli etmiyorsa sıfat 'güçlü' çekilip artikel görevini üstlenir." },
    ],
    sources: [SRC.duden, SRC.canoo, SRC.dw],
  },

  {
    slug: "nebensaetze",
    title: "Yan cümleler — weil, dass, wenn, ob",
    subtitle: "Bağlaç → cümle sonunda fiil.",
    level: "A2",
    minutes: 6,
    emoji: "🔗",
    blocks: [
      { type: "p", text: "Subjunktiv bağlaçlar (weil, dass, wenn, ob, obwohl, damit…) yan cümle açar. Yan cümlede çekilmiş fiil EN SONA gider." },
      { type: "h", text: "Şablon" },
      { type: "p", text: "Hauptsatz, weil  +  Subjekt  +  ...  +  finite Verb." },
      { type: "examples", items: [
        { de: "Ich lerne Deutsch, weil ich in Berlin arbeite.", tr: "Almanca öğreniyorum çünkü Berlin'de çalışıyorum." },
        { de: "Sie sagt, dass sie morgen kommt.",                tr: "Yarın geleceğini söylüyor." },
        { de: "Wenn es regnet, bleiben wir zu Hause.",           tr: "Yağmur yağarsa evde kalırız." },
        { de: "Ich weiß nicht, ob er Zeit hat.",                  tr: "Vakti var mı bilmiyorum." },
      ]},
      { type: "h", text: "Modal fiil + yan cümle" },
      { type: "p", text: "Yan cümlede modal fiil sonda; mastar fiil ondan ÖNCE gelir." },
      { type: "examples", items: [
        { de: "..., weil ich Deutsch lernen muss.", tr: "... çünkü Almanca öğrenmek zorundayım." },
      ]},
      { type: "h", text: "weil vs denn" },
      { type: "list", items: [
        "weil → yan cümle açar, fiil sona gider.",
        "denn → eşit-koordineli; sıralama değişmez (Hauptsatz + denn + Hauptsatz).",
        "Örnek: 'Ich bleibe zu Hause, denn ich bin krank.' (fiil 2. pozisyonda)",
      ]},
      { type: "warn", text: "Yan cümle başta gelirse, ana cümlenin fiili HEMEN virgülden sonra başa gelir: 'Wenn es regnet, bleiben wir zu Hause.' (bleiben — 1. pozisyon)" },
    ],
    sources: [SRC.duden, SRC.canoo, SRC.dw],
  },
];

export function findLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
