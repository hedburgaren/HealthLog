"use client";

/**
 * The acute-event form, loaded when the capture picker first opens it.
 * The picker sits in the shell of every authenticated page; this keeps the
 * form and its i18n chip labels out of that bundle. Same arrangement as the
 * life-event form.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

function FormSkeleton() {
  return (
    <div className="space-y-4" data-slot="acute-event-form-loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

export const AcuteEventForm = dynamic(
  () =>
    import("./acute-event-form").then((m) => ({ default: m.AcuteEventForm })),
  { ssr: false, loading: FormSkeleton },
);
