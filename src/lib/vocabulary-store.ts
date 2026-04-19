import type {
  VocabularyCoverage,
  VocabularyTechniqueMap,
  VocabularyTechniqueProfile,
} from "@/types/vocabulary";
import { profileScopedKey } from "@/lib/profile-store";

function vocabKey() {
  return profileScopedKey("letmequiz.vocabulary.techniques");
}

type VocabularyStoreData = Record<string, VocabularyTechniqueMap>;

function isBrowser() {
  return typeof window !== "undefined";
}

function emptyProfile(): VocabularyTechniqueProfile {
  return {
    keyword: "",
    mnemonicStory: "",
    memoryPalaceCue: "",
    contextSentence: "",
    sentencePatternOne: "",
    sentencePatternTwo: "",
    sentencePatternThree: "",
    sitcomClipNote: "",
    contrastWord: "",
    morphologyNote: "",
    pronunciationTip: "",
    updatedAt: "",
  };
}

function safeReadStore(): VocabularyStoreData {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(vocabKey());
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as VocabularyStoreData;
  } catch {
    return {};
  }
}

function safeWriteStore(value: VocabularyStoreData) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(vocabKey(), JSON.stringify(value));
  } catch {
    // Ignore storage write errors.
  }
}

export function getTechniqueMapForSet(setId: string): VocabularyTechniqueMap {
  const store = safeReadStore();
  return store[setId] ?? {};
}

export function getTechniqueProfile(setId: string, cardId: string): VocabularyTechniqueProfile {
  const map = getTechniqueMapForSet(setId);
  const profile = map[cardId];
  if (!profile) {
    return emptyProfile();
  }

  return {
    ...emptyProfile(),
    ...profile,
  };
}

export function upsertTechniqueProfile(
  setId: string,
  cardId: string,
  patch: Partial<VocabularyTechniqueProfile>
): VocabularyTechniqueMap {
  const store = safeReadStore();
  const setMap = store[setId] ?? {};
  const current = setMap[cardId] ?? emptyProfile();

  const nextProfile: VocabularyTechniqueProfile = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const nextSetMap: VocabularyTechniqueMap = {
    ...setMap,
    [cardId]: nextProfile,
  };

  safeWriteStore({
    ...store,
    [setId]: nextSetMap,
  });

  return nextSetMap;
}

function filled(value: string): boolean {
  return value.trim().length > 0;
}

export function getTechniqueCoverage(setId: string, cardIds: string[]): VocabularyCoverage {
  const map = getTechniqueMapForSet(setId);
  const total = Math.max(1, cardIds.length);

  let keyword = 0;
  let mnemonic = 0;
  let context = 0;
  let palace = 0;
  let strong = 0;

  for (const cardId of cardIds) {
    const profile = map[cardId] ?? emptyProfile();
    const hasKeyword = filled(profile.keyword);
    const hasMnemonic = filled(profile.mnemonicStory);
    const hasContext = filled(profile.contextSentence);
    const hasPalace = filled(profile.memoryPalaceCue);

    if (hasKeyword) {
      keyword += 1;
    }
    if (hasMnemonic) {
      mnemonic += 1;
    }
    if (hasContext) {
      context += 1;
    }
    if (hasPalace) {
      palace += 1;
    }
    if (hasKeyword && hasMnemonic && hasContext) {
      strong += 1;
    }
  }

  return {
    keywordCoverage: Math.round((keyword / total) * 100),
    mnemonicCoverage: Math.round((mnemonic / total) * 100),
    contextCoverage: Math.round((context / total) * 100),
    memoryPalaceCoverage: Math.round((palace / total) * 100),
    strongCards: strong,
  };
}
