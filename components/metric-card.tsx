import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MetricCardValue } from "@/lib/types";

type MetricCardProps = {
  card: MetricCardValue;
  icon: LucideIcon;
};

export function MetricCard({ card, icon: Icon }: MetricCardProps) {
  return (
    <Card className="border-slate-200/80">
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase text-slate-500">
            {card.label}
          </p>
          <p className="text-2xl font-semibold text-slate-950">
            {card.value}
          </p>
          <p className="text-xs leading-5 text-slate-500">{card.helper}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
