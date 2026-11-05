"use client";

/**
 * The evening check-in: the day's four self-reports in one sheet, so the
 * question "what was today, actually?" is one sweep instead of four views.
 *
 * Four optional sections, each saving through its own route:
 *
 *   - the day's mood (the five-word scale; the full mood form with its
 *     dimensions and tags stays where it is, this is the one-word answer),
 *   - an acute stressor event (what kind, how bad, a note),
 *   - the day's everyday exertion (what it was, how heavy, how long),
 *   - a symptom occurrence (one of the person's own symptoms, how strong).
 *
 * A section only saves when the person filled in what that route requires,
 * and the save runs the attempted writes in order, so a failure in one
 * section never silently drops another. The composite is own-record only:
 * two of its routes take no delegate at any share level, so the whole sheet
 * is withdrawn under a shared record rather than half-offered.
 */
import { localDateTimeValue } from "@/components/day/prefill";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ACUTE_EVENT_CATEGORY_KEY } from "@/components/day/label-keys";
import { toastWrittenOutcome } from "@/components/outcome/outcome-toast";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorRow } from "@/components/ui/query-error-row";
import { SliderField } from "@/components/ui/slider";
import { apiPost } from "@/lib/api/api-fetch";
import { localizedApiError } from "@/lib/api/localized-error";
import {
  ACUTE_EVENT_CATEGORIES,
  ACUTE_EVENT_INTENSITY_MAX,
  ACUTE_EVENT_INTENSITY_MIN,
} from "@/lib/acute-events/shared";
import {
  EXERTION_INTENSITY_MAX,
  EXERTION_INTENSITY_MIN,
} from "@/lib/exertion/shared";
import {
  SYMPTOM_INTENSITY_MAX,
  SYMPTOM_INTENSITY_MIN,
} from "@/lib/symptoms/shared";
import { MOOD_ENUM_VALUES, MOOD_LABEL_KEYS } from "@/lib/mood/labels";
import {
  invalidateKeys,
  moodDependentKeys,
  refetchInactiveDailyReads,
} from "@/lib/query-keys";
import { useTranslations } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

import { useLogAcuteEvent } from "@/components/acute-events/use-acute-events";
import { useLogExertionEvent } from "@/components/exertion/use-exertion";
import {
  useLogSymptomEvent,
  useSymptomDefinitions,
} from "@/components/symptoms/use-symptoms";

const NOTE_MAX_LENGTH = 500;

interface CheckinFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** The sheet's footer slot; the action row portals into it. */
  footerSlot?: HTMLElement | null;
  /** A calendar day (`YYYY-MM-DD`) the check-in is about. Defaults to now. */
  defaultDate?: string;
}

export function CheckinForm({
  onSuccess,
  onCancel,
  footerSlot,
  defaultDate,
}: CheckinFormProps) {
  const { t } = useTranslations();
  const queryClient = useQueryClient();
  const logAcute = useLogAcuteEvent();
  const logExertion = useLogExertionEvent();
  const logSymptom = useLogSymptomEvent();
  const definitions = useSymptomDefinitions(false);

  const occurredAt = () =>
    new Date(localDateTimeValue(defaultDate)).toISOString();

  // Mood.
  const [mood, setMood] = useState<string | null>(null);
  // Acute event.
  const [acuteCategory, setAcuteCategory] = useState<string | null>(null);
  const [acuteIntensity, setAcuteIntensity] = useState<number | null>(null);
  const [acuteNote, setAcuteNote] = useState("");
  // Exertion.
  const [exertionLabel, setExertionLabel] = useState("");
  const [exertionIntensity, setExertionIntensity] = useState<number | null>(
    null,
  );
  const [exertionDuration, setExertionDuration] = useState("");
  // Symptom.
  const [symptomId, setSymptomId] = useState<string | null>(null);
  const [symptomIntensity, setSymptomIntensity] = useState<number | null>(null);
  const [symptomNote, setSymptomNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const definitionsList = definitions.data?.definitions ?? [];

  function resetForm() {
    setMood(null);
    setAcuteCategory(null);
    setAcuteIntensity(null);
    setAcuteNote("");
    setExertionLabel("");
    setExertionIntensity(null);
    setExertionDuration("");
    setSymptomId(null);
    setSymptomIntensity(null);
    setSymptomNote("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const wantsMood = mood !== null;
    const wantsAcute = acuteCategory !== null && acuteIntensity !== null;
    const wantsExertion =
      exertionLabel.trim().length > 0 && exertionIntensity !== null;
    const wantsSymptom = symptomId !== null && symptomIntensity !== null;
    if (!wantsMood && !wantsAcute && !wantsExertion && !wantsSymptom) {
      setError(t("checkin.nothingSelected"));
      return;
    }

    setSaving(true);
    let saved = 0;
    const attempted =
      Number(wantsMood) +
      Number(wantsAcute) +
      Number(wantsExertion) +
      Number(wantsSymptom);
    const failures: string[] = [];
    const at = occurredAt();

    if (wantsMood) {
      try {
        await apiPost("/api/mood-entries", { mood, moodLoggedAt: at });
        saved += 1;
        // The mood route's own write-eviction contract, the same pair the
        // mood form runs after its create.
        await invalidateKeys(queryClient, moodDependentKeys);
        await refetchInactiveDailyReads(queryClient);
      } catch (err) {
        failures.push(t("nav.mood"));
        setError(localizedApiError(err, t, "checkin.saveError"));
      }
    }
    if (wantsAcute) {
      try {
        await logAcute.mutateAsync({
          category: acuteCategory as (typeof ACUTE_EVENT_CATEGORIES)[number],
          intensity: acuteIntensity as number,
          occurredAt: at,
          note: acuteNote.trim() ? acuteNote.trim() : undefined,
        });
        saved += 1;
      } catch (err) {
        failures.push(t("nav.capture.acuteEvent"));
        setError(localizedApiError(err, t, "acuteEvents.saveError"));
      }
    }
    if (wantsExertion) {
      const duration =
        exertionDuration.trim().length > 0
          ? Number(exertionDuration.trim())
          : null;
      try {
        await logExertion.mutateAsync({
          label: exertionLabel.trim(),
          intensity: exertionIntensity as number,
          occurredAt: at,
          durationMin:
            duration !== null && Number.isInteger(duration) && duration >= 1
              ? duration
              : undefined,
        });
        saved += 1;
      } catch (err) {
        failures.push(t("nav.capture.exertion"));
        setError(localizedApiError(err, t, "exertion.saveError"));
      }
    }
    if (wantsSymptom) {
      try {
        await logSymptom.mutateAsync({
          definitionId: symptomId as string,
          intensity: symptomIntensity as number,
          occurredAt: at,
          note: symptomNote.trim() ? symptomNote.trim() : undefined,
        });
        saved += 1;
      } catch (err) {
        failures.push(t("nav.capture.symptom"));
        setError(localizedApiError(err, t, "symptoms.saveError"));
      }
    }

    setSaving(false);
    if (saved === attempted) {
      toastWrittenOutcome("success", t("checkin.savedAll", { count: saved }));
      resetForm();
      onSuccess?.();
      return;
    }
    // Some sections landed, some did not: say which, and keep the sheet
    // open on the state it had, so a retry does not double-write the ones
    // that landed.
    toastWrittenOutcome(
      "partial",
      t("checkin.savedSome", { saved, attempted }),
    );
    if (failures.length > 0) {
      toast.info(failures.join(", "));
    }
  }

  const footerNode = (
    <div className="flex w-full items-center justify-end gap-2">
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          {t("common.cancel")}
        </Button>
      )}
      <Button type="submit" form="checkin-form" disabled={saving}>
        {saving ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <Plus className="size-4" />
        )}
        {t("checkin.save")}
      </Button>
    </div>
  );

  return (
    <form
      id="checkin-form"
      onSubmit={handleSubmit}
      className="space-y-5"
      data-testid="checkin-form"
    >
      <div className="space-y-2">
        <Label>{t("checkin.moodHeading")}</Label>
        <div
          role="radiogroup"
          aria-label={t("checkin.moodHeading")}
          className="flex flex-wrap gap-2"
        >
          {MOOD_ENUM_VALUES.map((value) => {
            const selected = mood === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid="checkin-mood-chip"
                onClick={() => setMood(selected ? null : value)}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-foreground hover:bg-accent",
                )}
              >
                {t(MOOD_LABEL_KEYS[value])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("checkin.acuteHeading")}</Label>
        <div className="flex flex-wrap gap-2">
          {ACUTE_EVENT_CATEGORIES.map((value) => {
            const selected = acuteCategory === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid="checkin-acute-chip"
                onClick={() => setAcuteCategory(selected ? null : value)}
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
        {acuteCategory !== null ? (
          <>
            <SliderField
              label={t("acuteEvents.entry.intensity")}
              value={acuteIntensity}
              onValueChange={setAcuteIntensity}
              min={ACUTE_EVENT_INTENSITY_MIN}
              max={ACUTE_EVENT_INTENSITY_MAX}
              step={1}
              lowAnchor={t("acuteEvents.entry.anchorLow")}
              highAnchor={t("acuteEvents.entry.anchorHigh")}
              emptyLabel={t("acuteEvents.entry.intensityUnset")}
            />
            <Input
              value={acuteNote}
              onChange={(e) => setAcuteNote(e.target.value)}
              placeholder={t("acuteEvents.entry.notePlaceholder")}
              maxLength={NOTE_MAX_LENGTH}
              enterKeyHint="done"
              autoCapitalize="sentences"
            />
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("checkin.exertionHeading")}</Label>
        <Input
          value={exertionLabel}
          onChange={(e) => setExertionLabel(e.target.value)}
          placeholder={t("exertion.entry.labelPlaceholder")}
          maxLength={60}
          enterKeyHint="done"
          autoCapitalize="sentences"
        />
        {exertionLabel.trim().length > 0 ? (
          <>
            <SliderField
              label={t("exertion.entry.intensity")}
              value={exertionIntensity}
              onValueChange={setExertionIntensity}
              min={EXERTION_INTENSITY_MIN}
              max={EXERTION_INTENSITY_MAX}
              step={1}
              lowAnchor={t("exertion.entry.anchorLow")}
              highAnchor={t("exertion.entry.anchorHigh")}
              emptyLabel={t("exertion.entry.intensityUnset")}
            />
            <FieldGroup
              htmlFor="checkin-exertion-duration"
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
                id="checkin-exertion-duration"
                value={exertionDuration}
                onChange={(e) => setExertionDuration(e.target.value)}
                placeholder={t("exertion.entry.durationPlaceholder")}
                inputMode="numeric"
                enterKeyHint="done"
              />
            </FieldGroup>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("checkin.symptomHeading")}</Label>
        {definitions.isError ? (
          <QueryErrorRow
            error={definitions.error}
            message={t("symptoms.section.loadError")}
            onRetry={() => void definitions.refetch()}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {definitionsList.map((definition) => {
              const selected = symptomId === definition.id;
              return (
                <button
                  key={definition.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid="checkin-symptom-chip"
                  onClick={() => setSymptomId(selected ? null : definition.id)}
                  className={cn(
                    "focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-8",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-foreground hover:bg-accent",
                  )}
                >
                  {definition.label ?? t("symptoms.unreadableLabel")}
                </button>
              );
            })}
          </div>
        )}
        {symptomId !== null ? (
          <>
            <SliderField
              label={t("symptoms.entry.intensity")}
              value={symptomIntensity}
              onValueChange={setSymptomIntensity}
              min={SYMPTOM_INTENSITY_MIN}
              max={SYMPTOM_INTENSITY_MAX}
              step={1}
              lowAnchor={t("symptoms.entry.anchorLow")}
              highAnchor={t("symptoms.entry.anchorHigh")}
              emptyLabel={t("symptoms.entry.intensityUnset")}
            />
            <Input
              value={symptomNote}
              onChange={(e) => setSymptomNote(e.target.value)}
              placeholder={t("symptoms.entry.notePlaceholder")}
              maxLength={NOTE_MAX_LENGTH}
              enterKeyHint="done"
              autoCapitalize="sentences"
            />
          </>
        ) : null}
        {definitionsList.length === 0 && !definitions.isLoading ? (
          <p className="text-muted-foreground text-xs">
            {t("symptoms.entry.emptyHint")}
          </p>
        ) : null}
      </div>

      {error && (
        <div
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
