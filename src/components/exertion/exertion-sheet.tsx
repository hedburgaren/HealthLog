"use client";

/**
 * The edit sheet of one everyday exertion entry: what it was, how heavy,
 * how long, when, the note, and Delete behind an AlertDialog. Same flow as
 * the acute-event sheet.
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
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { SliderField } from "@/components/ui/slider";
import { localizedApiError } from "@/lib/api/localized-error";
import {
  EXERTION_INTENSITY_MAX,
  EXERTION_INTENSITY_MIN,
} from "@/lib/exertion/shared";
import { useTranslations } from "@/lib/i18n/context";
import { useDeleteExertionEvent, useUpdateExertionEvent } from "./use-exertion";

const NOTE_MAX_LENGTH = 500;

export interface ExertionSheetTarget {
  id: string;
  label: string | null;
  occurredAt: string;
  intensity: number;
  durationMin: number | null;
  note: string | null;
}

interface ExertionSheetProps {
  target: ExertionSheetTarget;
  onClose: () => void;
}

export function ExertionSheet({ target, onClose }: ExertionSheetProps) {
  const { t } = useTranslations();
  const update = useUpdateExertionEvent();
  const remove = useDeleteExertionEvent();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [label, setLabel] = useState(target.label ?? "");
  const [intensity, setIntensity] = useState<number>(target.intensity);
  const [durationMin, setDurationMin] = useState(
    target.durationMin === null ? "" : String(target.durationMin),
  );
  const [occurredAt, setOccurredAt] = useState(target.occurredAt.slice(0, 16));
  const [note, setNote] = useState(target.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(target.label ?? "");
    setIntensity(target.intensity);
    setDurationMin(
      target.durationMin === null ? "" : String(target.durationMin),
    );
    setOccurredAt(target.occurredAt.slice(0, 16));
    setNote(target.note ?? "");
  }, [target]);

  async function handleSave() {
    setError(null);
    const duration =
      durationMin.trim().length > 0 ? Number(durationMin.trim()) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1)) {
      setError(t("exertion.entry.durationInvalid"));
      return;
    }
    try {
      await update.mutateAsync({
        id: target.id,
        label: label.trim(),
        intensity,
        occurredAt: new Date(occurredAt).toISOString(),
        durationMin: duration,
        note: note.trim() ? note.trim() : null,
      });
      onClose();
    } catch (err) {
      setError(localizedApiError(err, t, "exertion.saveError"));
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await remove.mutateAsync(target.id);
      onClose();
    } catch (err) {
      setError(localizedApiError(err, t, "exertion.saveError"));
    }
  }

  const low = t("exertion.entry.anchorLow");
  const high = t("exertion.entry.anchorHigh");

  return (
    <>
      <ResponsiveSheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={t("exertion.sheet.editTitle")}
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
          <FieldGroup
            htmlFor="exertion-sheet-label"
            label={t("exertion.entry.label")}
          >
            <Input
              id="exertion-sheet-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              enterKeyHint="done"
              autoCapitalize="sentences"
              required
              aria-required="true"
            />
          </FieldGroup>

          <SliderField
            label={t("exertion.entry.intensity")}
            value={intensity}
            onValueChange={setIntensity}
            min={EXERTION_INTENSITY_MIN}
            max={EXERTION_INTENSITY_MAX}
            step={1}
            lowAnchor={low}
            highAnchor={high}
            emptyLabel={t("exertion.entry.intensityUnset")}
            valueText={t("exertion.entry.intensityValueText", {
              value: intensity,
              max: EXERTION_INTENSITY_MAX,
              low,
              high,
            })}
          />

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup
              htmlFor="exertion-sheet-duration"
              label={
                <>
                  {t("exertion.entry.duration")}
                  <span className="text-muted-foreground ml-1 font-normal">
                    ({t("common.optional")})
                  </span>
                </>
              }
            >
              <Input
                id="exertion-sheet-duration"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder={t("exertion.entry.durationPlaceholder")}
                inputMode="numeric"
                enterKeyHint="done"
              />
            </FieldGroup>

            <FieldGroup
              htmlFor="exertion-sheet-when"
              label={t("exertion.entry.when")}
              hint={t("measurements.timestampBackdateHint")}
            >
              <DateTimeField
                id="exertion-sheet-when"
                value={occurredAt}
                onChange={setOccurredAt}
                required
                aria-required="true"
              />
            </FieldGroup>
          </div>

          <FieldGroup
            htmlFor="exertion-sheet-note"
            label={
              <>
                {t("exertion.entry.note")}
                <span className="text-muted-foreground ml-1 font-normal">
                  ({t("common.optional")})
                </span>
              </>
            }
          >
            <Input
              id="exertion-sheet-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("exertion.entry.notePlaceholder")}
              maxLength={NOTE_MAX_LENGTH}
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
            <AlertDialogTitle>{t("exertion.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("exertion.deleteDescription")}
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
