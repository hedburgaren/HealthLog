"use client";

/**
 * The exertion edit sheet, loaded when the timeline first opens it. Same
 * arrangement as the life-event sheet.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

function SheetSkeleton() {
  return (
    <div className="space-y-4" data-slot="exertion-sheet-loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

export const ExertionSheet = dynamic(
  () => import("./exertion-sheet").then((m) => ({ default: m.ExertionSheet })),
  { ssr: false, loading: SheetSkeleton },
);
