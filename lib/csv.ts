import type { P1RegistrationRow } from "@/lib/types";

const csvHeaders: Array<[keyof P1RegistrationRow, string]> = [
  ["year", "Year"],
  ["schoolName", "School Name"],
  ["schoolSlug", "School Slug"],
  ["schoolAreaId", "School Area ID"],
  ["phase", "Phase"],
  ["totalVacancies", "Total Vacancies"],
  ["totalApplicants", "Total Applicants"],
  ["ballotingRequired", "Balloting Required"],
  ["vacanciesBalloted", "Vacancies Balloted"],
  ["applicantsBalloted", "Applicants Balloted"],
  ["prCap", "PR Cap"],
  ["remarks", "Remarks"],
  ["ballotingDetails", "Balloting Details"],
  ["sourceUrl", "Source URL"],
  ["scrapedAt", "Scraped At"],
  ["vacancyDelta", "Vacancy Delta"],
  ["utilisationRate", "Utilisation Rate"],
  ["oversubscribed", "Oversubscribed"]
];

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function rowsToCsv(rows: P1RegistrationRow[]) {
  const headerRow = csvHeaders.map(([, label]) => escapeCsv(label)).join(",");

  const dataRows = rows.map((row) =>
    csvHeaders
      .map(([key]) => {
        const value = row[key];
        if (value === null || value === undefined) {
          return "";
        }

        return escapeCsv(String(value));
      })
      .join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}
