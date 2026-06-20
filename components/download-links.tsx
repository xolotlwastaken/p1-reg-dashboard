import { ArrowDownToLine, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { getYearCsvHref } from "@/lib/downloads";

type DownloadLinksProps = {
  years: string[];
};

export function DownloadLinks({ years }: DownloadLinksProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="border-slate-200/80">
        <CardHeader>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Download className="h-4 w-4" />
          </div>
          <CardTitle>All years CSV</CardTitle>
          <CardDescription>
            Spreadsheet-friendly export of the combined normalized dataset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full justify-between">
            <a href="/data/all.csv" download>
              Download all.csv
              <ArrowDownToLine className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {years.map((year) => (
        <Card className="border-slate-200/80" key={year}>
          <CardHeader>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Download className="h-4 w-4" />
            </div>
            <CardTitle>{year} CSV</CardTitle>
            <CardDescription>
              Year-specific export for focused manual analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <a href={getYearCsvHref(year)} download>
                Download {year}.csv
                <ArrowDownToLine className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
