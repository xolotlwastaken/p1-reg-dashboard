"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Filter,
  MapPinned,
  RotateCcw,
  Search,
  Sparkles,
  TableProperties,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { DataTable } from "@/components/data-table";
import { DownloadLinks } from "@/components/download-links";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildBallotingCounts,
  buildMetricCards,
  buildPhaseTotals,
  buildTopOversubscribed
} from "@/lib/analytics";
import { rowsToCsv } from "@/lib/csv";
import type { GeneratedManifest, P1RegistrationRow } from "@/lib/types";

type DashboardProps = {
  rows: P1RegistrationRow[];
  manifest: GeneratedManifest;
};

type SharedFilters = {
  year: string;
  phase: string;
  school: string;
  balloting: string;
  oversubscribed: string;
  search: string;
};

const initialFilters: SharedFilters = {
  year: "",
  phase: "",
  school: "",
  balloting: "",
  oversubscribed: "",
  search: ""
};

const metricIcons = [MapPinned, TableProperties, TrendingUp, Sparkles] as const;
const phaseOrder = ["1", "2A", "2B", "2C", "2CS"];

function includesCaseInsensitive(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

function matchesTriState(value: boolean | null, filter: string): boolean {
  if (!filter) {
    return true;
  }

  if (filter === "yes") {
    return value === true;
  }

  if (filter === "no") {
    return value === false;
  }

  return value === null;
}

function sortPhases(phases: string[]) {
  return [...phases].sort((a, b) => {
    const aIndex = phaseOrder.indexOf(a);
    const bIndex = phaseOrder.indexOf(b);

    if (aIndex >= 0 && bIndex >= 0) {
      return aIndex - bIndex;
    }

    if (aIndex >= 0) {
      return -1;
    }

    if (bIndex >= 0) {
      return 1;
    }

    return a.localeCompare(b);
  });
}

function exportFilteredCsv(rows: P1RegistrationRow[]) {
  const blob = new Blob([rowsToCsv(rows)], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "p1-registration-filtered.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <select
        aria-label={label}
        className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function InsightCard({
  title,
  value,
  helper
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <p className="text-xs font-medium uppercase text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200/80">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">{children}</div>
      </CardContent>
    </Card>
  );
}

export function Dashboard({ rows, manifest }: DashboardProps) {
  const [filters, setFilters] = useState<SharedFilters>(initialFilters);

  const analysisRows = useMemo(
    () => rows.filter((row) => row.phase !== "0"),
    [rows]
  );

  const years = useMemo(
    () => [...new Set(analysisRows.map((row) => row.year))].sort(),
    [analysisRows]
  );

  const phases = useMemo(
    () => sortPhases([...new Set(analysisRows.map((row) => row.phase))]),
    [analysisRows]
  );

  const filteredRows = useMemo(() => {
    return analysisRows.filter((row) => {
      if (filters.year && row.year !== filters.year) {
        return false;
      }

      if (filters.phase && row.phase !== filters.phase) {
        return false;
      }

      if (filters.school && !includesCaseInsensitive(row.schoolName, filters.school)) {
        return false;
      }

      if (!matchesTriState(row.ballotingRequired, filters.balloting)) {
        return false;
      }

      if (!matchesTriState(row.oversubscribed, filters.oversubscribed)) {
        return false;
      }

      if (!filters.search) {
        return true;
      }

      const haystack = [
        row.schoolName,
        row.schoolSlug,
        row.phase,
        row.remarks,
        row.ballotingDetails,
        row.prCap
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(filters.search.toLowerCase());
    });
  }, [analysisRows, filters]);

  const metricCards = useMemo(() => buildMetricCards(filteredRows), [filteredRows]);
  const phaseTotals = useMemo(() => buildPhaseTotals(filteredRows), [filteredRows]);
  const topOversubscribed = useMemo(
    () => buildTopOversubscribed(filteredRows),
    [filteredRows]
  );
  const ballotingCounts = useMemo(
    () => buildBallotingCounts(filteredRows),
    [filteredRows]
  );

  const mostOversubscribed = topOversubscribed[0];
  const busiestPhase = [...phaseTotals].sort((a, b) => b.applicants - a.applicants)[0];
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <section className="sticky top-0 z-40 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Filters
            </div>
            <Badge variant="outline" className="w-fit rounded-md px-2 py-1">
              {filteredRows.length.toLocaleString("en-SG")} matching rows
            </Badge>
          </div>

          <div className="grid items-end gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_minmax(170px,0.9fr)_repeat(4,minmax(118px,0.6fr))_auto_auto]">
            <label className="grid gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Free-text search"
                  className="h-9 rounded-md pl-8 text-xs"
                  placeholder="Search schools, remarks, balloting"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                />
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                School
              </span>
              <Input
                aria-label="School name"
                className="h-9 rounded-md text-xs"
                placeholder="e.g. Rosyth"
                value={filters.school}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, school: event.target.value }))
                }
              />
            </label>

            <SelectField
              label="Year"
              value={filters.year}
              onChange={(value) =>
                setFilters((current) => ({ ...current, year: value }))
              }
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Phase"
              value={filters.phase}
              onChange={(value) =>
                setFilters((current) => ({ ...current, phase: value }))
              }
            >
              <option value="">All phases</option>
              {phases.map((phase) => (
                <option key={phase} value={phase}>
                  Phase {phase}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Balloting"
              value={filters.balloting}
              onChange={(value) =>
                setFilters((current) => ({ ...current, balloting: value }))
              }
            >
              <option value="">Any</option>
              <option value="yes">Required</option>
              <option value="no">Not required</option>
              <option value="na">N/A</option>
            </SelectField>

            <SelectField
              label="Oversubscribed"
              value={filters.oversubscribed}
              onChange={(value) =>
                setFilters((current) => ({ ...current, oversubscribed: value }))
              }
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </SelectField>

            <Button
              aria-label={`Reset filters. ${activeFilterCount} active`}
              className="h-9"
              size="icon"
              variant="outline"
              onClick={() => setFilters(initialFilters)}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Export filtered CSV"
              className="h-9"
              size="icon"
              onClick={() => exportFilteredCsv(filteredRows)}
              type="button"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="explorer">Data explorer</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Source: MOE
            </Badge>
            {manifest.sourceUrl ? (
              <a
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition hover:text-slate-950"
                href={manifest.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open source page
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <TabsContent value="overview" className="space-y-5">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card, index) => (
              <MetricCard
                card={card}
                icon={metricIcons[index] ?? TableProperties}
                key={card.label}
              />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle>Helpful takeaways</CardTitle>
                <CardDescription>
                  A quick summary of the strongest signals in the current filtered view.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <InsightCard
                  title="Biggest shortage"
                  value={
                    mostOversubscribed
                      ? mostOversubscribed.label
                      : "No oversubscribed rows"
                  }
                  helper={
                    mostOversubscribed
                      ? `${mostOversubscribed.shortage} more applicants than vacancies`
                      : "The current filtered rows are not oversubscribed."
                  }
                />
                <InsightCard
                  title="Busiest phase"
                  value={busiestPhase ? busiestPhase.phase : "No data"}
                  helper={
                    busiestPhase
                      ? `${busiestPhase.applicants.toLocaleString("en-SG")} applicants in this phase`
                      : "Apply a broader filter to compare phase demand."
                  }
                />
                <InsightCard
                  title="Data coverage"
                  value={`${new Set(filteredRows.map((row) => row.schoolSlug)).size} schools`}
                  helper="Unique schools represented after the current shared filters."
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle>Current selection</CardTitle>
                <CardDescription>
                  Keep an eye on the exact slice of data you are analyzing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <span className="text-sm text-slate-500">Rows in scope</span>
                  <span className="text-sm font-semibold text-slate-950">
                    {filteredRows.length.toLocaleString("en-SG")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <span className="text-sm text-slate-500">Oversubscribed rows</span>
                  <span className="text-sm font-semibold text-slate-950">
                    {filteredRows
                      .filter((row) => row.oversubscribed)
                      .length.toLocaleString("en-SG")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <span className="text-sm text-slate-500">Balloting required</span>
                  <span className="text-sm font-semibold text-slate-950">
                    {filteredRows
                      .filter((row) => row.ballotingRequired)
                      .length.toLocaleString("en-SG")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Applicants vs vacancies"
              description="Demand and available places by registration phase."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseTotals}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="phase" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="vacancies" fill="#0f172a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="applicants" fill="#94a3b8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Top oversubscribed rows"
              description="The sharpest shortages in the filtered results."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOversubscribed} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={120}
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <Tooltip />
                  <Bar dataKey="shortage" fill="#334155" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Balloting required"
              description="Count of rows requiring balloting in each phase."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ballotingCounts}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="phase" stroke="#64748b" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#475569" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        </TabsContent>

        <TabsContent value="explorer">
          <DataTable
            activePhase={filters.phase}
            allRows={rows}
            rows={filteredRows}
          />
        </TabsContent>

        <TabsContent value="downloads" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">
              Raw downloads
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Grab the combined CSV or a year-specific file for your own manual
              modeling and spreadsheet work.
            </p>
          </div>
          <DownloadLinks years={manifest.years} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
