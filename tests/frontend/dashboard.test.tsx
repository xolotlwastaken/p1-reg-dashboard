import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/components/dashboard";
import { rowsToCsv } from "@/lib/csv";
import type { GeneratedManifest, P1RegistrationRow } from "@/lib/types";

const rows: P1RegistrationRow[] = [
  {
    year: "2025",
    schoolName: "North Vista Primary School",
    schoolSlug: "north-vista-primary-school",
    schoolAreaId: 77,
    phase: "0",
    totalVacancies: 210,
    totalApplicants: 0,
    ballotingRequired: null,
    vacanciesBalloted: 0,
    applicantsBalloted: 0,
    prCap: "",
    remarks: "",
    ballotingDetails: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: 210,
    utilisationRate: 0,
    oversubscribed: false
  },
  {
    year: "2025",
    schoolName: "North Vista Primary School",
    schoolSlug: "north-vista-primary-school",
    schoolAreaId: 77,
    phase: "1",
    totalVacancies: 150,
    totalApplicants: 0,
    ballotingRequired: null,
    vacanciesBalloted: 0,
    applicantsBalloted: 0,
    prCap: "",
    remarks: "",
    ballotingDetails: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: 150,
    utilisationRate: 0,
    oversubscribed: false
  },
  {
    year: "2025",
    schoolName: "North Vista Primary School",
    schoolSlug: "north-vista-primary-school",
    schoolAreaId: 77,
    phase: "2C",
    totalVacancies: 60,
    totalApplicants: 78,
    ballotingRequired: true,
    vacanciesBalloted: 60,
    applicantsBalloted: 61,
    prCap: "",
    remarks: "",
    ballotingDetails: "Within 1km",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: -18,
    utilisationRate: 1.3,
    oversubscribed: true
  },
  {
    year: "2025",
    schoolName: "Rosyth School",
    schoolSlug: "rosyth-school",
    schoolAreaId: 31,
    phase: "0",
    totalVacancies: 240,
    totalApplicants: 0,
    ballotingRequired: null,
    vacanciesBalloted: 0,
    applicantsBalloted: 0,
    prCap: "",
    remarks: "",
    ballotingDetails: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: 240,
    utilisationRate: 0,
    oversubscribed: false
  },
  {
    year: "2025",
    schoolName: "Rosyth School",
    schoolSlug: "rosyth-school",
    schoolAreaId: 31,
    phase: "1",
    totalVacancies: 200,
    totalApplicants: 0,
    ballotingRequired: null,
    vacanciesBalloted: 0,
    applicantsBalloted: 0,
    prCap: "",
    remarks: "",
    ballotingDetails: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: 200,
    utilisationRate: 0,
    oversubscribed: false
  },
  {
    year: "2025",
    schoolName: "Rosyth School",
    schoolSlug: "rosyth-school",
    schoolAreaId: 31,
    phase: "2A",
    totalVacancies: 88,
    totalApplicants: 74,
    ballotingRequired: false,
    vacanciesBalloted: 0,
    applicantsBalloted: 0,
    prCap: "",
    remarks: "No balloting required.",
    ballotingDetails: "",
    sourceUrl: "https://example.com",
    scrapedAt: "2026-06-20T00:00:00+00:00",
    vacancyDelta: 14,
    utilisationRate: 0.8409,
    oversubscribed: false
  }
];

const manifest: GeneratedManifest = {
  generatedAt: "2026-06-20T00:00:00+00:00",
  sourceUrl: "https://example.com",
  years: ["2025"],
  totalRows: 6,
  rowsByYear: { "2025": 6 }
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("filters rows through global search", async () => {
    const user = userEvent.setup();
    render(<Dashboard rows={rows} manifest={manifest} />);

    await user.type(screen.getByLabelText("Free-text search"), "within 1km");
    expect(screen.getByText("1 matching rows")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /data explorer/i }));

    expect(screen.getByText("North Vista Primary School")).toBeInTheDocument();
    expect(screen.queryByText("Rosyth School")).not.toBeInTheDocument();
  });

  it("sorts the table when a header is clicked", async () => {
    const user = userEvent.setup();
    render(<Dashboard rows={rows} manifest={manifest} />);
    await user.click(screen.getByRole("tab", { name: /data explorer/i }));

    const sortButtons = screen.getAllByRole("button", { name: /sort by school/i });
    await user.click(sortButtons[0]);

    const bodyRows = screen.getAllByRole("row").filter((row) => {
      return within(row).queryByText("North Vista Primary School") || within(row).queryByText("Rosyth School");
    });

    expect(bodyRows[0]).toHaveTextContent("North Vista Primary School");

    await user.click(sortButtons[0]);
    const updatedRows = screen.getAllByRole("row").filter((row) => {
      return within(row).queryByText("North Vista Primary School") || within(row).queryByText("Rosyth School");
    });

    expect(updatedRows[0]).toHaveTextContent("Rosyth School");
  });

  it("applies a column filter from the data table", async () => {
    const user = userEvent.setup();
    render(<Dashboard rows={rows} manifest={manifest} />);
    await user.click(screen.getByRole("tab", { name: /data explorer/i }));
    await user.click(screen.getByRole("button", { name: /show advanced filters/i }));

    await user.type(screen.getAllByLabelText("Filter schoolName")[0], "Rosyth");

    expect(screen.queryAllByText("North Vista Primary School")).toHaveLength(0);
    expect(screen.getByText("Rosyth School")).toBeInTheDocument();
  });

  it("uses phase 0 for total vacancies and derives phase 1 applicants from phase 2A vacancies", async () => {
    const user = userEvent.setup();
    render(<Dashboard rows={rows} manifest={manifest} />);

    await user.click(screen.getByRole("tab", { name: /data explorer/i }));

    expect(screen.getByRole("button", { name: /^sort by p1$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sort by p1 vac/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sort by p1 app/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sort by p2c$/i })).toBeInTheDocument();

    const rosythRow = screen.getAllByRole("row").find((row) =>
      within(row).queryByText("Rosyth School")
    );

    expect(rosythRow).toBeDefined();
    expect(rosythRow).toHaveTextContent("240");
    expect(rosythRow).toHaveTextContent("112");
    expect(rosythRow).toHaveTextContent("No ballot");
  });

  it("uses the phase filter to narrow the table phase columns", async () => {
    const user = userEvent.setup();
    render(<Dashboard rows={rows} manifest={manifest} />);

    await user.selectOptions(screen.getByLabelText("Phase"), "2C");
    await user.click(screen.getByRole("tab", { name: /data explorer/i }));

    expect(screen.getByRole("button", { name: /^sort by p2c$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^sort by p1$/i })).not.toBeInTheDocument();
    expect(screen.getByText("North Vista Primary School")).toBeInTheDocument();
    expect(screen.queryByText("Rosyth School")).not.toBeInTheDocument();
  });

  it("exports the filtered rows as CSV", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-url");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<Dashboard rows={rows} manifest={manifest} />);
    await user.type(screen.getByLabelText("School name"), "North Vista");
    await user.click(screen.getByRole("button", { name: /export filtered csv/i }));

    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:mock-url");
    expect(clickMock).toHaveBeenCalled();
  });
});

describe("rowsToCsv", () => {
  it("includes human-readable headers", () => {
    const csv = rowsToCsv(rows);
    expect(csv).toContain("School Name");
    expect(csv).toContain("North Vista Primary School");
  });
});
