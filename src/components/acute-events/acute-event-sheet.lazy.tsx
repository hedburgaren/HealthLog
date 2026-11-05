"use client";

/**
 * The acute-event edit sheet, loaded when the timeline first opens it.
 * Same arrangement as the life-event sheet.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

function SheetSkeleton() {
  return (
    <div className="space-y-4" data-slot="acute-event-sheet-loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

export const AcuteEventSheet = dynamic(
  () =>
    import("./acute-event-sheet").then((m) => ({ default: m.AcuteEventSheet })),
  { ssr: false, loading: SheetSkeleton },
);
