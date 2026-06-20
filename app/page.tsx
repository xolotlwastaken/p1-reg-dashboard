import { Activity, CalendarClock, Database, ExternalLink, School } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dashboard } from "@/components/dashboard";
import { readAllRows, readManifest } from "@/lib/data";

export default async function HomePage() {
  const [rows, manifest] = await Promise.all([readAllRows(), readManifest()]);

  const stats = [
    {
      label: "Rows indexed",
      value: manifest.totalRows.toLocaleString("en-SG"),
      icon: Database
    },
    {
      label: "Years available",
      value: manifest.years.join(", ") || "None yet",
      icon: CalendarClock
    },
    {
      label: "Schools tracked",
      value: new Set(rows.map((row) => row.schoolSlug)).size.toLocaleString("en-SG"),
      icon: School
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <Badge variant="outline" className="w-fit rounded-md px-2 py-1">
              Singapore P1 Registration
            </Badge>
            <h1 className="text-2xl font-semibold text-slate-950">
              P1 registration dashboard
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-slate-700" />
                {manifest.generatedAt
                  ? new Date(manifest.generatedAt).toLocaleString("en-SG")
                  : "Not refreshed yet"}
              </span>
              <a
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 transition hover:text-slate-950"
                href={manifest.sourceUrl || "#"}
                rel="noreferrer"
                target="_blank"
              >
                MOE source
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                key={label}
              >
                <Icon className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-950">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <Dashboard rows={rows} manifest={manifest} />
      </div>
    </main>
  );
}
