import type {
  BallotingCount,
  MetricCardValue,
  P1RegistrationRow,
  PhaseTotals
} from "@/lib/types";

function numberFormatter(value: number) {
  return new Intl.NumberFormat("en-SG").format(value);
}

export function buildMetricCards(rows: P1RegistrationRow[]): MetricCardValue[] {
  const schoolCount = new Set(rows.map((row) => row.schoolSlug)).size;
  const oversubscribed = rows.filter((row) => row.oversubscribed).length;
  const balloting = rows.filter((row) => row.ballotingRequired).length;

  return [
    {
      label: "Schools",
      value: numberFormatter(schoolCount),
      helper: "Unique schools in the current filtered set"
    },
    {
      label: "Rows",
      value: numberFormatter(rows.length),
      helper: "School and phase combinations available"
    },
    {
      label: "Oversubscribed",
      value: numberFormatter(oversubscribed),
      helper: "Applicants exceeded vacancies"
    },
    {
      label: "Balloting",
      value: numberFormatter(balloting),
      helper: "Rows where balloting was required"
    }
  ];
}

export function buildPhaseTotals(rows: P1RegistrationRow[]): PhaseTotals[] {
  const map = new Map<string, PhaseTotals>();

  for (const row of rows) {
    const current = map.get(row.phase) ?? {
      phase: row.phase,
      applicants: 0,
      vacancies: 0
    };

    current.applicants += row.totalApplicants;
    current.vacancies += row.totalVacancies;
    map.set(row.phase, current);
  }

  return [...map.values()].sort((a, b) => a.phase.localeCompare(b.phase));
}

export function buildTopOversubscribed(rows: P1RegistrationRow[]) {
  return [...rows]
    .filter((row) => row.oversubscribed)
    .sort((a, b) => a.vacancyDelta - b.vacancyDelta)
    .slice(0, 10)
    .map((row) => ({
      label: `${row.schoolName} (${row.phase})`,
      shortage: Math.abs(row.vacancyDelta),
      applicants: row.totalApplicants,
      vacancies: row.totalVacancies
    }));
}

export function buildBallotingCounts(rows: P1RegistrationRow[]): BallotingCount[] {
  const map = new Map<string, number>();

  for (const row of rows) {
    if (!row.ballotingRequired) {
      continue;
    }

    map.set(row.phase, (map.get(row.phase) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([phase, count]) => ({ phase, count }))
    .sort((a, b) => a.phase.localeCompare(b.phase));
}
