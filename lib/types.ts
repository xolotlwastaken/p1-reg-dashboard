export type P1RegistrationRow = {
  year: string;
  schoolName: string;
  schoolSlug: string;
  schoolAreaId: number | null;
  phase: string;
  totalVacancies: number;
  totalApplicants: number;
  ballotingRequired: boolean | null;
  vacanciesBalloted: number;
  applicantsBalloted: number;
  prCap: string;
  remarks: string;
  ballotingDetails: string;
  sourceUrl: string;
  scrapedAt: string;
  vacancyDelta: number;
  utilisationRate: number | null;
  oversubscribed: boolean;
};

export type GeneratedManifest = {
  generatedAt: string;
  sourceUrl: string;
  years: string[];
  totalRows: number;
  rowsByYear: Record<string, number>;
};

export type MetricCardValue = {
  label: string;
  value: string;
  helper: string;
};

export type PhaseTotals = {
  phase: string;
  applicants: number;
  vacancies: number;
};

export type BallotingCount = {
  phase: string;
  count: number;
};
