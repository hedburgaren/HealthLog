"use client";

/**
 * The edit sheet of one acute stressor event: category, intensity, when,
 * the note, and Delete behind an AlertDialog. Opened from the timeline's
 * chronicle and selection bar, the same flow the life-event sheet rides.
 */
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateTimeField } from "@/components/ui/date-time-field";
import { FieldGroup } from "@/components/ui/field-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { SliderField } from "@/components/ui/slider";
import { localizedApiError } from "@/lib/api/localized-error";
import {
  ACUTE_EVENT_CATEGORIES,
  ACUTE_EVENT_INTENSITY_MAX,
  ACUTE_EVENT_INTENSITY_MIN,
} from "@/lib/acute-events/shared";
import { useTranslations } from "@/lib/i18n/context";
import { useDeleteAcuteEvent, useUpdateAcuteEvent } from "./use-acute-events";
import { ACUTE_EVENT_CATEGORY_KEY } from "@/components/day/label-keys";
import { cn } from "@/lib/utils";

export interface AcuteEventSheetTarget {
  id: string;
  category: string;
  occurredAt: string;
  intensity: number;
  note: string | null;
}

interface AcuteEventSheetProps {
  target: AcuteEventSheetTarget;
  onClose: () => void;
}

export function AcuteEventSheet({ target, onClose }: AcuteEventSheetProps) {
  const { t } = useTranslations();
  const update = useUpdateAcuteEvent();
  const remove = useDeleteAcuteEvent();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [category, setCategory] = useState<string>(target.category);
  const [intensity, setIntensity] = useState<number>(target.intensity);
  const [occurredAt, setOccurredAt] = useState(target.occurredAt.slice(0, 16));
  const [note, setNote] = useState(target.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategory(target.category);
    setIntensity(target.intensity);
    setOccurredAt(target.occurredAt.slice(0, 16));
    setNote(target.note ?? "");
  }, [target]);

  async function handleSave() {
    setError(null);
    try {
      await update.mutateAsync({
        id: target.id,
        category: category as (typeof ACUTE_EVENT_CATEGORIES)[number],
        intensity,
        occurredAt: new Date(occurredAt).toISOString(),
        note: note.trim() ? note.trim() : null,
      });
      onClose();
    } catch (err) {
      setError(localizedApiError(err, t, "acuteEvents.saveError"));
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await remove.mutateAsync(target.id);
      onClose();
    } catch (err) {
      setError(localizedApiError(err, t, "acuteEvents.saveError"));
    }
  }

  const low = t("acuteEvents.entry.anchorLow");
  const high = t("acuteEvents.entry.anchorHigh");

  return (
    <>
      <ResponsiveSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={t("acuteEvents.sheet.editTitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={remove.isPending || update.isPending}
            >
              {t("common.delete")}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={update.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("acuteEvents.entry.category")}</Label>
            <div
              role="radiogroup"
              aria-label={t("acuteEvents.entry.category")}
              className="flex flex-wrap gap-2"
            >
              {ACUTE_EVENT_CATEGORIES.map((value) => {
                const selected = category === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCategory(value)}
                    className={cn(
                      "focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-foreground hover:bg-accent",
                    )}
                  >
                    {t(ACUTE_EVENT_CATEGORY_KEY[value])}
                  </button>
                );
              })}
            </div>
          </div>

          <SliderField
            label={t("acuteEvents.entry.intensity")}
            value={intensity}
            onValueChange={setIntensity}
            min={ACUTE_EVENT_INTENSITY_MIN}
            max={ACUTE_EVENT_INTENSITY_MAX}
            step={1}
            lowAnchor={low}
            highAnchor={high}
            emptyLabel={t("acuteEvents.entry.intensityUnset")}
            valueText={t("acuteEvents.entry.intensityValueText", {
              value: intensity,
              max: ACUTE_EVENT_INTENSITY_MAX,
              low,
              high,
            })}
          />

          <FieldGroup
            htmlFor="acute-sheet-when"
            label={t("acuteEvents.entry.when")}
            hint={t("measurements.timestampBackdateHint")}
          >
            <DateTimeField
              id="acute-sheet-when"
              value={occurredAt}
              onChange={setOccurredAt}
              required
              aria-required="true"
            />
          </FieldGroup>

          <FieldGroup
            htmlFor="acute-sheet-note"
            label={
              <>
                {t("acuteEvents.entry.note")}
                <span className="text-muted-foreground ml-1 font-normal">
                  ({t("common.optional")})
                </span>
              </>
            }
          >
            <Input
              id="acute-sheet-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              enterKeyHint="done"
              autoCapitalize="sentences"
            />
          </FieldGroup>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
            >
              {error}
            </div>
          )}
        </div>
      </ResponsiveSheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("acuteEvents.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("acuteEvents.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
