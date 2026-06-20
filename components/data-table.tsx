"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { P1RegistrationRow } from "@/lib/types";

type DataTableProps = {
  rows: P1RegistrationRow[];
  allRows: P1RegistrationRow[];
  activePhase?: string;
};

const phaseOrder = ["1", "2A", "2B", "2C", "2CS"] as const;
type PhaseKey = (typeof phaseOrder)[number];

type PhaseSnapshot = {
  phase: string;
  totalVacancies: number;
  totalApplicants: number;
  ballotingRequired: boolean | null;
  vacanciesBalloted: number;
  applicantsBalloted: number;
  remarks: string;
  ballotingDetails: string;
  vacancyDelta: number;
  utilisationRate: number | null;
  oversubscribed: boolean;
};

type SchoolGroupedRow = {
  id: string;
  year: string;
  schoolName: string;
  schoolSlug: string;
  schoolAreaId: number | null;
  totalVacancies: number;
  totalApplicants: number;
  ballotingPhases: number;
  oversubscribedPhases: number;
  phases: Partial<Record<string, PhaseSnapshot>>;
};

function getSchoolYearKey(row: Pick<P1RegistrationRow, "schoolSlug" | "year">) {
  return `${row.year}:${row.schoolSlug}`;
}

function getPhaseApplicants(row: SchoolGroupedRow, phase: string) {
  const snapshot = row.phases[phase];

  if (!snapshot) {
    return null;
  }

  if (phase === "1" && snapshot.totalApplicants === 0) {
    const phase2A = row.phases["2A"];

    if (phase2A && snapshot.totalVacancies >= phase2A.totalVacancies) {
      return snapshot.totalVacancies - phase2A.totalVacancies;
    }
  }

  return snapshot.totalApplicants;
}

function buildTotalVacancyLookup(rows: P1RegistrationRow[]) {
  const lookup = new Map<string, number>();

  for (const row of rows) {
    if (row.phase === "0") {
      lookup.set(getSchoolYearKey(row), row.totalVacancies);
    }
  }

  for (const row of rows) {
    const key = getSchoolYearKey(row);

    if (row.phase === "1" && !lookup.has(key)) {
      lookup.set(key, row.totalVacancies);
    }
  }

  return lookup;
}

function buildGroupedRows(
  rows: P1RegistrationRow[],
  totalVacancyLookup: Map<string, number>
) {
  const grouped = new Map<string, SchoolGroupedRow>();

  for (const row of rows) {
    const key = getSchoolYearKey(row);
    const current = grouped.get(key) ?? {
      id: key,
      year: row.year,
      schoolName: row.schoolName,
      schoolSlug: row.schoolSlug,
      schoolAreaId: row.schoolAreaId,
      totalVacancies: totalVacancyLookup.get(key) ?? row.totalVacancies,
      totalApplicants: 0,
      ballotingPhases: 0,
      oversubscribedPhases: 0,
      phases: {}
    };

    current.ballotingPhases += row.ballotingRequired ? 1 : 0;
    current.oversubscribedPhases += row.oversubscribed ? 1 : 0;
    current.phases[row.phase] = {
      phase: row.phase,
      totalVacancies: row.totalVacancies,
      totalApplicants: row.totalApplicants,
      ballotingRequired: row.ballotingRequired,
      vacanciesBalloted: row.vacanciesBalloted,
      applicantsBalloted: row.applicantsBalloted,
      remarks: row.remarks,
      ballotingDetails: row.ballotingDetails,
      vacancyDelta: row.vacancyDelta,
      utilisationRate: row.utilisationRate,
      oversubscribed: row.oversubscribed
    };
    grouped.set(key, current);
  }

  for (const row of grouped.values()) {
    row.totalVacancies =
      totalVacancyLookup.get(row.id) ?? row.phases["1"]?.totalVacancies ?? row.totalVacancies;
    row.totalApplicants = Object.keys(row.phases).reduce((total, phase) => {
      return total + (getPhaseApplicants(row, phase) ?? 0);
    }, 0);
  }

  return [...grouped.values()];
}

const fuzzyTextFilter: FilterFn<SchoolGroupedRow> = (row, columnId, filterValue) => {
  if (!filterValue) {
    return true;
  }

  const value = row.getValue(columnId);
  return String(value ?? "")
    .toLowerCase()
    .includes(String(filterValue).toLowerCase());
};

function formatPhaseHeader(phase: string) {
  return `P${phase}`;
}

function buildPhaseFilterText(row: SchoolGroupedRow, phase: string) {
  const snapshot = row.phases[phase];

  if (!snapshot) {
    return "";
  }

  const applicants = getPhaseApplicants(row, phase);
  const balloting =
    snapshot.ballotingRequired === true
      ? "balloting required yes"
      : snapshot.ballotingRequired === false
        ? "no balloting no"
        : "balloting not applicable na";

  return [
    phase,
    snapshot.totalVacancies,
    applicants ?? "",
    snapshot.vacancyDelta,
    balloting,
    snapshot.remarks,
    snapshot.ballotingDetails
  ]
    .join(" ")
    .toLowerCase();
}

function PhaseCell({
  row,
  phase
}: {
  row: SchoolGroupedRow;
  phase: string;
}) {
  const snapshot = row.phases[phase];

  if (!snapshot) {
    return <span className="text-slate-300">-</span>;
  }

  const applicants = getPhaseApplicants(row, phase);
  const ballotingVariant =
    snapshot.ballotingRequired === true
      ? "warning"
      : snapshot.ballotingRequired === false
        ? "success"
        : "outline";
  const ballotingLabel =
    snapshot.ballotingRequired === true
      ? "Ballot"
      : snapshot.ballotingRequired === false
        ? "No ballot"
        : "N/A";

  return (
    <div className="w-[88px] space-y-1.5">
      <div className="space-y-0.5 text-[11px] leading-4">
        <div className="inline-flex w-full items-center justify-between gap-2">
          <span className="text-slate-400">Vac</span>
          <span className="font-medium tabular-nums text-slate-800">
            {snapshot.totalVacancies.toLocaleString("en-SG")}
          </span>
        </div>
        <div className="inline-flex w-full items-center justify-between gap-2">
          <span className="text-slate-400">App</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              snapshot.oversubscribed ? "text-rose-700" : "text-slate-800"
            )}
          >
            {(applicants ?? 0).toLocaleString("en-SG")}
          </span>
        </div>
      </div>
      <Badge variant={ballotingVariant} className="rounded-md px-1.5 py-0.5 text-[10px]">
        {ballotingLabel}
      </Badge>
    </div>
  );
}

export function DataTable({ rows, allRows, activePhase = "" }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const totalVacancyLookup = useMemo(() => buildTotalVacancyLookup(allRows), [allRows]);
  const selectedKeys = useMemo(
    () => new Set(rows.map((row) => getSchoolYearKey(row))),
    [rows]
  );
  const rowsForVisibleSchools = useMemo(
    () =>
      allRows.filter(
        (row) => row.phase !== "0" && selectedKeys.has(getSchoolYearKey(row))
      ),
    [allRows, selectedKeys]
  );
  const groupedRows = useMemo(
    () => buildGroupedRows(rowsForVisibleSchools, totalVacancyLookup),
    [rowsForVisibleSchools, totalVacancyLookup]
  );

  const visiblePhases = useMemo(() => {
    if (activePhase) {
      return [activePhase];
    }

    const phaseSet = new Set(
      rowsForVisibleSchools
        .filter((row) => row.phase !== "0")
        .map((row) => row.phase)
    );
    const ordered = phaseOrder.filter((phase) => phaseSet.has(phase));
    const extras = [...phaseSet].filter(
      (phase) => !phaseOrder.includes(phase as PhaseKey)
    );
    return [...ordered, ...extras];
  }, [activePhase, rowsForVisibleSchools]);

  const showYearColumn = useMemo(
    () => new Set(groupedRows.map((row) => row.year)).size > 1,
    [groupedRows]
  );

  const columns = useMemo<ColumnDef<SchoolGroupedRow>[]>(() => {
    const baseColumns: ColumnDef<SchoolGroupedRow>[] = [
      ...(showYearColumn
        ? [{ accessorKey: "year", header: "Year", filterFn: fuzzyTextFilter }]
        : []),
      {
        accessorKey: "schoolName",
        header: "School",
        filterFn: fuzzyTextFilter,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.original.schoolName}</div>
            <div className="text-xs text-slate-400">{row.original.schoolSlug}</div>
          </div>
        )
      },
      { accessorKey: "schoolAreaId", header: "Area", filterFn: fuzzyTextFilter },
      {
        accessorKey: "totalVacancies",
        header: "Total Vac",
        filterFn: fuzzyTextFilter
      },
      {
        accessorKey: "totalApplicants",
        header: "Total App",
        filterFn: fuzzyTextFilter
      },
      {
        accessorKey: "oversubscribedPhases",
        header: "Hot Phases",
        filterFn: fuzzyTextFilter
      },
      {
        accessorKey: "ballotingPhases",
        header: "Ballot Phases",
        filterFn: fuzzyTextFilter
      }
    ];

    const phaseColumns: ColumnDef<SchoolGroupedRow>[] = visiblePhases.map((phase) => ({
      id: phase,
      header: formatPhaseHeader(phase),
      accessorFn: (row) => getPhaseApplicants(row, phase) ?? -1,
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) {
          return true;
        }

        return buildPhaseFilterText(row.original, phase).includes(
          String(filterValue).toLowerCase()
        );
      },
      cell: ({ row }) => <PhaseCell phase={phase} row={row.original} />
    }));

    return [...baseColumns, ...phaseColumns];
  }, [showYearColumn, visiblePhases]);

  const table = useReactTable({
    data: groupedRows,
    columns,
    state: {
      sorting,
      columnFilters
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <Card className="overflow-hidden border-slate-200/80">
      <CardHeader className="gap-3 border-b border-slate-200/80 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">School explorer</CardTitle>
            <CardDescription className="max-w-2xl text-xs leading-5">
              One row per school. Each phase cell shows vacancies, applicants,
              and whether balloting was required.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Badge variant="outline" className="rounded-md px-2 py-1">
              {visibleRows.length.toLocaleString("en-SG")} visible schools
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnFilters((current) => !current)}
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showColumnFilters ? "Hide advanced filters" : "Show advanced filters"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortState = header.column.getIsSorted();
                    const icon =
                      sortState === "asc" ? (
                        <ArrowDownAZ className="h-4 w-4" />
                      ) : sortState === "desc" ? (
                        <ArrowUpZA className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4" />
                      );

                    return (
                      <th
                        className={cn(
                          "border-b border-slate-200 px-2.5 py-2 font-medium text-slate-500",
                          phaseOrder.includes(header.column.id as PhaseKey) &&
                            "border-l border-slate-100 px-4",
                          header.column.id === "schoolName" &&
                            "sticky left-0 z-20 bg-slate-50",
                          header.column.id === "year" &&
                            showYearColumn &&
                            "sticky left-0 z-20 bg-slate-50",
                          header.column.id === "schoolName" &&
                            showYearColumn &&
                            "sticky left-[76px] z-20 bg-slate-50"
                        )}
                        key={header.id}
                      >
                        <button
                          aria-label={`Sort by ${String(
                            header.column.columnDef.header ?? header.column.id
                          )}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-950"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {icon}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              ))}

              {showColumnFilters ? (
                <tr>
                  {table.getAllLeafColumns().map((column) => {
                    const value = column.getFilterValue();
                    const key = String(column.id);

                    return (
                      <th
                        className={cn(
                          "border-b border-slate-200 px-2.5 py-2",
                          phaseOrder.includes(column.id as PhaseKey) &&
                            "border-l border-slate-100 px-4",
                          column.id === "schoolName" &&
                            "sticky left-0 z-10 bg-white",
                          column.id === "year" &&
                            showYearColumn &&
                            "sticky left-0 z-10 bg-white",
                          column.id === "schoolName" &&
                            showYearColumn &&
                            "sticky left-[76px] z-10 bg-white"
                        )}
                        key={`filter-${column.id}`}
                      >
                        <Input
                          aria-label={`Filter ${key}`}
                          className="h-8 rounded-md text-xs"
                          placeholder={`Filter ${key}`}
                          value={String(value ?? "")}
                          onChange={(event) =>
                            column.setFilterValue(event.target.value || undefined)
                          }
                        />
                      </th>
                    );
                  })}
                </tr>
              ) : null}
            </thead>

            <tbody>
              {visibleRows.map((row) => (
                <tr
                  className="border-b border-slate-100 transition hover:bg-slate-50/80"
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={cn(
                        "px-2.5 py-2.5 align-top text-slate-600",
                        phaseOrder.includes(cell.column.id as PhaseKey) &&
                          "border-l border-slate-100 px-4",
                        cell.column.id === "schoolName" && "min-w-[220px] font-medium text-slate-900",
                        cell.column.id === "year" &&
                          showYearColumn &&
                          "sticky left-0 z-10 bg-white font-medium text-slate-700",
                        cell.column.id === "schoolName" &&
                          !showYearColumn &&
                          "sticky left-0 z-10 bg-white",
                        cell.column.id === "schoolName" &&
                          showYearColumn &&
                          "sticky left-[76px] z-10 bg-white"
                      )}
                      key={cell.id}
                    >
                      {cell.column.columnDef.cell
                        ? flexRender(cell.column.columnDef.cell, cell.getContext())
                        : String(cell.getValue() ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
          <span>
            {visibleRows.length.toLocaleString("en-SG")} schools after explorer filters
          </span>
          <button
            className="inline-flex items-center gap-2 font-medium text-slate-700 transition hover:text-slate-950"
            onClick={() => setShowColumnFilters((current) => !current)}
            type="button"
          >
            {showColumnFilters ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Collapse advanced filters
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expand advanced filters
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
