export type Card = {
  id: string;
  term: string;
  definition: string;
  position: number;
};

export type StudySet = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  cards: Card[];
};

export type StudySetSummary = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  cardCount: number;
};

export type CreateSetInput = {
  title: string;
  description?: string;
  cards: Array<{
    term: string;
    definition: string;
  }>;
};
