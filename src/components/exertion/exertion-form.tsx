"use client";

/**
 * Log one everyday exertion entry: what it was (the person's own words),
 * how heavy it felt (0-10 perceived exertion), optionally how long it took,
 * when, and an optional note.
 *
 * Built like the symptom quick-entry form it sits beside: the `FieldGroup`
 * rhythm, `SliderField` for the bounded scale, `DateTimeField` prefilled
 * with now, the note with its counter, inline field errors, and the kebab +
 * Cancel + Save action row portalled into the sheet's footer slot so it
 * stays above the phone keyboard.
 */
import { localDateTimeValue } from "@/components/day/prefill";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MoreHorizontal, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field-group";
import { Input } from "@/components/ui/input";
import { SliderField } from "@/components/ui/slider";
import { toastWrittenOutcome } from "@/components/outcome/outcome-toast";
import { localizedApiError } from "@/lib/api/localized-error";
import {
  EXERTION_INTENSITY_MAX,
  EXERTION_INTENSITY_MIN,
  MAX_EXERTION_LABEL_CHARS,
} from "@/lib/exertion/shared";
import { useTranslations } from "@/lib/i18n/context";
import { useLogExertionEvent } from "./use-exertion";

const NOTE_MAX_LENGTH = 500;

function nowLocalValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface ExertionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** The sheet's footer slot; the action row portals into it. */
  footerSlot?: HTMLElement | null;
  /**
   * A calendar day (`YYYY-MM-DD`) to start the date on, when the form is
   * opened from that day. Defaults to now.
   */
  defaultDate?: string;
}

export function ExertionForm({
  onSuccess,
  onCancel,
  footerSlot,
  defaultDate,
}: ExertionFormProps) {
  const { t } = useTranslations();
  const log = useLogExertionEvent();

  const [label, setLabel] = useState("");
  const [intensity, setIntensity] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState(() =>
    localDateTimeValue(defaultDate),
  );
  const [note, setNote] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [intensityError, setIntensityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formId = useId();
  const errorId = useId();

  function resetForm() {
    setLabel("");
    setIntensity(null);
    setDurationMin("");
    setOccurredAt(localDateTimeValue(defaultDate));
    setNote("");
    setLabelError(null);
    setIntensityError(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const missingLabel = label.trim().length === 0;
    const missingIntensity = intensity === null;
    setLabelError(missingLabel ? t("exertion.entry.labelRequired") : null);
    setIntensityError(
      missingIntensity ? t("exertion.entry.intensityRequired") : null,
    );
    if (missingLabel || missingIntensity) return;

    const duration =
      durationMin.trim().length > 0 ? Number(durationMin.trim()) : null;
    if (duration !== null && (!Number.isInteger(duration) || duration < 1)) {
      setError(t("exertion.entry.durationInvalid"));
      return;
    }

    try {
      await log.mutateAsync({
        label: label.trim(),
        intensity,
        occurredAt: new Date(occurredAt).toISOString(),
        durationMin: duration,
        note: note.trim() ? note.trim() : undefined,
      });
      toastWrittenOutcome("success", t("common.saved"));
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(localizedApiError(err, t, "exertion.saveError"));
    }
  }

  const footerNode = (
    <div className="flex w-full items-center justify-between gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            disabled={log.isPending}
            aria-label={t("common.moreOptions")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={resetForm}>
            <RotateCcw className="mr-2 size-4" />
            {t("exertion.entry.reset")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={log.isPending}
          >
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" form={formId} disabled={log.isPending}>
          {log.isPending ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Plus className="size-4" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );

  const low = t("exertion.entry.anchorLow");
  const high = t("exertion.entry.anchorHigh");

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="exertion-form"
    >
      <FieldGroup
        htmlFor={`${formId}-label`}
        label={t("exertion.entry.label")}
        labelAccessory={
          <span className="text-muted-foreground text-xs">
            {label.length}/{MAX_EXERTION_LABEL_CHARS}
          </span>
        }
      >
        <Input
          id={`${formId}-label`}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setLabelError(null);
          }}
          placeholder={t("exertion.entry.labelPlaceholder")}
          maxLength={MAX_EXERTION_LABEL_CHARS}
          enterKeyHint="done"
          autoCapitalize="sentences"
          aria-invalid={labelError ? true : undefined}
          aria-describedby={labelError ? `${formId}-label-error` : undefined}
          required
          aria-required="true"
        />
        {labelError ? (
          <p
            id={`${formId}-label-error`}
            role="alert"
            className="text-destructive text-sm"
          >
            {labelError}
          </p>
        ) : null}
      </FieldGroup>

      <div className="space-y-2">
        <SliderField
          label={t("exertion.entry.intensity")}
          value={intensity}
          onValueChange={(next) => {
            setIntensity(next);
            setIntensityError(null);
          }}
          min={EXERTION_INTENSITY_MIN}
          max={EXERTION_INTENSITY_MAX}
          step={1}
          lowAnchor={low}
          highAnchor={high}
          emptyLabel={t("exertion.entry.intensityUnset")}
          valueText={
            intensity === null
              ? undefined
              : t("exertion.entry.intensityValueText", {
                  value: intensity,
                  max: EXERTION_INTENSITY_MAX,
                  low,
                  high,
                })
          }
        />
        {intensityError ? (
          <p role="alert" className="text-destructive text-sm">
            {intensityError}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup
          htmlFor={`${formId}-duration`}
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
            id={`${formId}-duration`}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder={t("exertion.entry.durationPlaceholder")}
            inputMode="numeric"
            enterKeyHint="done"
          />
        </FieldGroup>

        <FieldGroup
          htmlFor={`${formId}-occurred-at`}
          label={t("exertion.entry.when")}
          hint={t("measurements.timestampBackdateHint")}
        >
          <DateTimeField
            id={`${formId}-occurred-at`}
            value={occurredAt}
            onChange={setOccurredAt}
            max={nowLocalValue()}
            required
            aria-required="true"
          />
        </FieldGroup>
      </div>

      <FieldGroup
        htmlFor={`${formId}-note`}
        label={
          <>
            {t("exertion.entry.note")}
            <span className="text-muted-foreground ml-1 font-normal">
              ({t("common.optional")})
            </span>
          </>
        }
        labelAccessory={
          <span className="text-muted-foreground text-xs">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        }
      >
        <Input
          id={`${formId}-note`}
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
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
        >
          {error}
        </div>
      )}

      {footerSlot ? createPortal(footerNode, footerSlot) : footerNode}
    </form>
  );
}
