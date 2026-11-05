"use client";

/**
 * The check-in form, loaded when the capture picker first opens it. The
 * picker sits in the shell of every authenticated page; this keeps the
 * composite and its three route hooks out of that bundle. Same arrangement
 * as the life-event form.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

function FormSkeleton() {
  return (
    <div className="space-y-4" data-slot="checkin-form-loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

export const CheckinForm = dynamic(
  () => import("./checkin-form").then((m) => ({ default: m.CheckinForm })),
  { ssr: false, loading: FormSkeleton },
);
