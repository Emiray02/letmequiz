import type { CreateSetInput, StudySet, StudySetSummary } from "@/types/study";

/**
 * Demo Almanca setleri. Supabase yapılandırılmadığında kullanılır.
 * Veriler gerçek sınav (telc / Goethe) odaklı, CEFR seviyelendirmeli.
 */

function makeSet(
  id: string,
  title: string,
  description: string,
  cards: Array<[string, string]>,
  daysAgo = 0,
): StudySet {
  const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id,
    title,
    description,
    createdAt: created,
    cards: cards.map(([term, definition], index) => ({
      id: `${id}-c${index + 1}`,
      term,
      definition,
      position: index,
    })),
  };
}

let mockSets: StudySet[] = [
  makeSet(
    "deu-a1-grundwortschatz",
    "A1 · Temel Kelime Hazinesi",
    "Goethe A1 ve telc A1 sınavlarının ilk 200 kelimesinden seçmeler.",
    [
      ["der Tag", "gün"],
      ["die Woche", "hafta"],
      ["der Monat", "ay"],
      ["das Jahr", "yıl"],
      ["die Familie", "aile"],
      ["der Vater", "baba"],
      ["die Mutter", "anne"],
      ["das Kind", "çocuk"],
      ["der Bruder", "erkek kardeş"],
      ["die Schwester", "kız kardeş"],
      ["wohnen", "ikamet etmek"],
      ["arbeiten", "çalışmak"],
      ["lernen", "öğrenmek"],
      ["sprechen", "konuşmak"],
      ["verstehen", "anlamak"],
    ],
    1,
  ),
  makeSet(
    "deu-a1-begruessung",
    "A1 · Selamlaşma & Tanışma",
    "Günlük hayatta ilk konuşmalar için kalıplar.",
    [
      ["Guten Morgen!", "Günaydın!"],
      ["Guten Tag!", "İyi günler!"],
      ["Guten Abend!", "İyi akşamlar!"],
      ["Wie heißt du?", "Adın ne?"],
      ["Ich heiße ...", "Benim adım ..."],
      ["Woher kommen Sie?", "Nerelisiniz?"],
      ["Ich komme aus der Türkei.", "Türkiye’denim."],
      ["Wo wohnen Sie?", "Nerede oturuyorsunuz?"],
      ["Sprechen Sie Englisch?", "İngilizce konuşur musunuz?"],
      ["Können Sie das bitte wiederholen?", "Lütfen tekrar eder misiniz?"],
    ],
    2,
  ),
  makeSet(
    "deu-a2-alltag",
    "A2 · Günlük Hayat & Hizmetler",
    "Marketten doktora, ulaşımdan randevuya — telc A2 odaklı.",
    [
      ["einen Termin vereinbaren", "randevu ayarlamak"],
      ["beim Arzt", "doktorda"],
      ["die Apotheke", "eczane"],
      ["die Krankenkasse", "sağlık sigortası"],
      ["die Rechnung", "fatura"],
      ["bar bezahlen", "nakit ödemek"],
      ["mit Karte zahlen", "kart ile ödemek"],
      ["Ich hätte gern ...", "... rica ediyorum (nazik istek)"],
      ["Wie komme ich zum Bahnhof?", "İstasyona nasıl giderim?"],
      ["umsteigen", "aktarma yapmak"],
      ["die Haltestelle", "durak"],
      ["der Fahrplan", "sefer çizelgesi"],
      ["sich bewerben", "iş başvurusu yapmak"],
      ["der Lebenslauf", "özgeçmiş"],
      ["das Vorstellungsgespräch", "iş görüşmesi"],
    ],
    3,
  ),
  makeSet(
    "deu-b1-arbeit",
    "B1 · İş Hayatı & Mesleki İletişim",
    "telc B1 Beruf ve Goethe Zertifikat B1 için ofis Almancası.",
    [
      ["die Besprechung", "toplantı"],
      ["die Tagesordnung", "gündem"],
      ["sich auf etwas einigen", "bir konuda anlaşmak"],
      ["einen Vorschlag machen", "öneri sunmak"],
      ["die Frist einhalten", "son tarihe uymak"],
      ["der Vorgesetzte", "amir"],
      ["der Kollege / die Kollegin", "iş arkadaşı"],
      ["zuständig sein für ...", "... ile ilgilenmek / sorumlu olmak"],
      ["die Verantwortung übernehmen", "sorumluluk almak"],
      ["sich krankmelden", "hastalık bildirmek"],
      ["Urlaub beantragen", "izin talep etmek"],
      ["die Gehaltserhöhung", "maaş zammı"],
    ],
    5,
  ),
  makeSet(
    "deu-modal-verben",
    "Modalverben · Çekimli Tablo",
    "können, müssen, dürfen, sollen, wollen, mögen — Präsens çekim örnekleri.",
    [
      ["ich kann", "yapabilirim"],
      ["du kannst", "yapabilirsin"],
      ["er/sie/es kann", "yapabilir"],
      ["wir können", "yapabiliriz"],
      ["ich muss", "yapmak zorundayım"],
      ["du musst", "yapmak zorundasın"],
      ["ich darf", "yapmama izin var"],
      ["ich soll", "yapmam gerekiyor"],
      ["ich will", "istiyorum (kararlı)"],
      ["ich möchte", "isterim (nazik)"],
    ],
    7,
  ),
  makeSet(
    "deu-praepositionen",
    "Präpositionen · Yönelme & Bulunma",
    "Wechselpräpositionen: an, auf, hinter, in, neben, über, unter, vor, zwischen.",
    [
      ["an der Wand", "duvarda"],
      ["an die Wand (hängen)", "duvara (asmak)"],
      ["auf dem Tisch", "masanın üstünde"],
      ["auf den Tisch (legen)", "masanın üstüne (koymak)"],
      ["in der Schule", "okulda"],
      ["in die Schule (gehen)", "okula (gitmek)"],
      ["zwischen den Häusern", "evlerin arasında"],
      ["zwischen die Häuser (stellen)", "evlerin arasına (koymak)"],
      ["über dem Bett", "yatağın üstünde (asılı)"],
      ["unter dem Stuhl", "sandalyenin altında"],
    ],
    9,
  ),
];

function cloneSet(set: StudySet): StudySet {
  return {
    ...set,
    cards: set.cards.map((card) => ({ ...card })),
  };
}

export function listMockStudySets(): StudySetSummary[] {
  return [...mockSets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      createdAt: set.createdAt,
      cardCount: set.cards.length,
    }));
}

export function getMockStudySetById(id: string): StudySet | null {
  const found = mockSets.find((set) => set.id === id);
  return found ? cloneSet(found) : null;
}

export function createMockStudySet(input: CreateSetInput): StudySet {
  const createdAt = new Date().toISOString();
  const created: StudySet = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    createdAt,
    cards: input.cards.map((card, index) => ({
      id: crypto.randomUUID(),
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: index,
    })),
  };

  mockSets = [created, ...mockSets];
  return cloneSet(created);
}
