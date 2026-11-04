"use client";

/**
 * Log one acute stressor event: what kind of day it was (the closed
 * category list), how bad it was (0-10, the scale the pain score uses),
 * when, and an optional note in the person's own words.
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
import { toastWrittenOutcome } from "@/components/outcome/outcome-toast";
import { DateTimeField } from "@/components/ui/date-time-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SliderField } from "@/components/ui/slider";
import { localizedApiError } from "@/lib/api/localized-error";
import { useTranslations } from "@/lib/i18n/context";
import {
  ACUTE_EVENT_CATEGORIES,
  ACUTE_EVENT_INTENSITY_MAX,
  ACUTE_EVENT_INTENSITY_MIN,
} from "@/lib/acute-events/shared";
import { ACUTE_EVENT_CATEGORY_KEY } from "@/components/day/label-keys";
import { useLogAcuteEvent } from "./use-acute-events";
import { cn } from "@/lib/utils";

const NOTE_MAX_LENGTH = 500;

function nowLocalValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** The message key of each category, for the chip row and the day view. */
interface AcuteEventFormProps {
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

export function AcuteEventForm({
  onSuccess,
  onCancel,
  footerSlot,
  defaultDate,
}: AcuteEventFormProps) {
  const { t } = useTranslations();
  const log = useLogAcuteEvent();

  const [category, setCategory] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [occurredAt, setOccurredAt] = useState(() =>
    localDateTimeValue(defaultDate),
  );
  const [note, setNote] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [intensityError, setIntensityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formId = useId();
  const errorId = useId();

  function resetForm() {
    setCategory(null);
    setIntensity(null);
    setOccurredAt(localDateTimeValue(defaultDate));
    setNote("");
    setCategoryError(null);
    setIntensityError(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const missingCategory = category === null;
    const missingIntensity = intensity === null;
    setCategoryError(
      missingCategory ? t("acuteEvents.entry.categoryRequired") : null,
    );
    setIntensityError(
      missingIntensity ? t("acuteEvents.entry.intensityRequired") : null,
    );
    if (missingCategory || missingIntensity) return;

    try {
      await log.mutateAsync({
        category: category as (typeof ACUTE_EVENT_CATEGORIES)[number],
        intensity,
        occurredAt: new Date(occurredAt).toISOString(),
        note: note.trim() ? note.trim() : undefined,
      });
      toastWrittenOutcome("success", t("common.saved"));
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(localizedApiError(err, t, "acuteEvents.saveError"));
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
            {t("acuteEvents.entry.reset")}
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

  const categoryGroupId = `${formId}-category`;
  const low = t("acuteEvents.entry.anchorLow");
  const high = t("acuteEvents.entry.anchorHigh");

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="acute-event-form"
    >
      <div className="space-y-2">
        <Label id={categoryGroupId}>{t("acuteEvents.entry.category")}</Label>
        <div
          role="radiogroup"
          aria-labelledby={categoryGroupId}
          aria-describedby={
            categoryError ? `${categoryGroupId}-error` : undefined
          }
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
                data-testid="acute-event-category-chip"
                onClick={() => {
                  setCategory(selected ? null : value);
                  setCategoryError(null);
                }}
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
        {categoryError ? (
          <p
            id={`${categoryGroupId}-error`}
            role="alert"
            className="text-destructive text-sm"
          >
            {categoryError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <SliderField
          label={t("acuteEvents.entry.intensity")}
          value={intensity}
          onValueChange={(next) => {
            setIntensity(next);
            setIntensityError(null);
          }}
          min={ACUTE_EVENT_INTENSITY_MIN}
          max={ACUTE_EVENT_INTENSITY_MAX}
          step={1}
          lowAnchor={low}
          highAnchor={high}
          emptyLabel={t("acuteEvents.entry.intensityUnset")}
          valueText={
            intensity === null
              ? undefined
              : t("acuteEvents.entry.intensityValueText", {
                  value: intensity,
                  max: ACUTE_EVENT_INTENSITY_MAX,
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

      <FieldGroup
        htmlFor={`${formId}-occurred-at`}
        label={t("acuteEvents.entry.when")}
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

      <FieldGroup
        htmlFor={`${formId}-note`}
        label={
          <>
            {t("acuteEvents.entry.note")}
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
          placeholder={t("acuteEvents.entry.notePlaceholder")}
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
