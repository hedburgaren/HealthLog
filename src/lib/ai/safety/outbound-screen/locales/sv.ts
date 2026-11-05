/** Outbound-screen banks for Swedish, composed by `../../outbound-screen.ts`. */
import {
  DRUG_UNIT,
  DOSE_UNIT,
  UNIT_END,
  objectSlot,
  TARGET,
  LETTER,
  ENGINE,
  medicationExtras,
  unlessDeferred,
  WORD_START,
  WORD_END,
  type LocaleBank,
} from "../shared";

const SV_STOP =
  "inte|ej|aldrig|och|eller|men|natrium|salt|koffein|socker|vatten|protein|fibrer|kalorier|steg|alkohol";

const SV_SLOT = objectSlot(SV_STOP);

const SV_SHORT = objectSlot(
  `${SV_STOP}|för|med|innan|efter|utan|till|i|på|av|om|under|mot|din|ditt|dina`,
  2,
);

const SV_MED_NOUN =
  "(?:(?:insulin|metformin|kvälls|morgon|middags|natt|blodtrycks)-?)?(?:dos(?:en|er|na)?|tabletter?|piller|kapslar?|dropper?|sprutor?|läkemedel|lakemedel|medicin(?:er)?|insulin|injektioner?|behandling(?:ar)?)";

const SPELLED_SV =
  "(?:noll|en|ett|tva|tre|fyra|fem|sex|sju|atta|nio|tio|elva|tolv|tretton|fjorton|femton|sexton|sjutton|arton|nitton|tjugo|trettio|fyrtio|femtio|sextio)";

const PCT_WORD_SV = `${SPELLED_SV}\\s+procent`;

const QUAL_NUM_SV = `(?:\\d{1,3}\\s*%|${PCT_WORD_SV})`;

const RISK_NOUN_SV = "(?:risken|risk|sannolikheten|sannolikhet|chansen|chans)";

const HORIZON_SV =
  "(?:(?:risken|risk)\\s+(?:för\\s+)?(?:hjärt-\\s?och\\s+kärlsjukdom|hjärtinfarkt|stroke|död|dödlighet)\\s+inom\\s+(?:10|tio)\\s+år)";

const RESULT_VERB_SV =
  "(?:(?:placerar|räknar|klassar)\\s+(?:dig\\s+)?(?:i|som)|du\\s+(?:hamnar|ligger|räknas|klassas)\\s+(?:i|som))";

const RISK_BAND_SV =
  "(?:(?:risk(?:kategori|klass|grupp)|kategori|klass|grupp)\\s+)?(?:hög|låg|måttlig|medel|förhöjd|intermediär)\\s+risk";

const RISK_LEVEL_SV =
  "(?:hög\\w*|låg\\w*|förhöjd\\w*|måttlig|medel\\w*|intermediär\\w*|gräns\\w*|oroande|signifikant\\w*)";

const RISK_VERDICT_SV = `(?:är|ligger|verkar|hamnar|indikerar|visar|pekar)\\s+(?:\\S+\\s+){0,2}${RISK_LEVEL_SV}`;

const SV_MED_CLASS =
  "(?:antikoagulantia|blodförtunnande(?:\\s+medicin)?|statiner|betablockerare|diuretika|vattendrivande(?:\\s+medicin)?|antidepressiva|blodtryckssänkande(?:\\s+medicin)?|blodtrycksmedicin|sockersänkande(?:\\s+medicin)?|sömntabletter)";

/** Signals that the number-free change shapes stand down for (`unlessDeferred`). */
const SV_DEFERRAL = `\\?|${WORD_START}(?:inte|ej|aldrig|endast om|bara om|om du|innan du|efter att du|tills du|fråga|prata|diskutera|konsult\\w*|läkare|lakare|doktor|sjuksköterska|apotek\\w*)${WORD_END}`;

export const bank: LocaleBank = {
  vocabulary: (names) =>
    `(?:${SV_MED_NOUN}|${medicationExtras(SV_MED_CLASS, names)})`,
  doseChangeClass: (med) => [
    // Swedish addresses the reader as "du" and the change imperative is the
    // bare stem ("höj", "sänk", "minska"). The indicative a log restatement
    // uses ("du tar 1000 mg", "dosen är nu 2000 mg") is in no verb list.
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)${WORD_START}(?:höj|öka|sänk|minska|ändra|justera|ställ\\s+om|gå\\s+(?:upp|ner)\\s+till)\\b\\s+${SV_SLOT}(?:från\\s+${TARGET}\\s+)?(?:till|på|med)\\s+${TARGET}`,
      "i",
    ),
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:ta|använd|börja\\s+(?:ta|med)|börja\\s+använda)\\s+${SV_SLOT}${TARGET}`,
      "i",
    ),
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:hoppa\\s+över|skippa|strunta\\s+i|avstå\\s+från|pausa|avbryt|dra\\s+in|dubbla|fördubbla|dela|klyva)\\s+${SV_SLOT}${med}`,
      "i",
    ),
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:sluta|lägg\\s+av)\\s+(?:ta|med|att\\s+ta)\\b`,
      "i",
    ),
    // Stop or drop a named medication or a drug class: "sluta med
    // blodförtunnande", "ta bort metforminet".
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:sluta|lägg\\s+av|ta\\s+bort|kasta)\\s+${SV_SHORT}${med}`,
      "i",
    ),
    // The same behind a recommending cue, with the verb in the infinitive.
    // A referral ("innan", "prata", "fråga", "om du") or a negation ends it.
    new RegExp(
      `${WORD_START}(?:du\\s+(?:bör|borde|får|skulle)|rekommenderar|föreslår|överväg|prova|testa|det\\s+(?:vore|är)\\s+(?:bra|klok[t]?|bättre))(?:(?!\\b(?:inte|ej|aldrig|innan|utan|fråga|konsult\\w*|prata|om\\s+du)(?![${LETTER}]))[^.?!]){0,40}?\\b(?:(?:sluta|lägga\\s+av)\\s+(?:ta|med)|hoppa\\s+över|paus\\w*|avbryt\\w*|dubbl\\w*|fördubbl\\w*|dela)\\s+${SV_SLOT}${med}`,
      "i",
    ),
    // An extra, another or one more of a medication: "ta en tablett till",
    // "ta en extra dos", "ta ytterligare en insulininjektion".
    new RegExp(
      `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:ta|använd|lägg\\s+till)\\s+${SV_SHORT}(?:(?:en|ett|två|\\d+)\\s+${SV_SHORT}(?:${med}|${SV_MED_NOUN})[^.?!]{0,20}?(?:\\btill\\b|\\bextra\\w*\\b|\\butöver\\b)|(?:en|ett|två|\\d+)\\s+extra\\s+(?:${med}|${SV_MED_NOUN})|(?:en\\s+till|ytterligare\\s+(?:en|ett))\\s+${SV_SHORT}${med})`,
      "i",
    ),
    // Halving or a fraction with no number: "halvera dosen",
    // "ta halva dosen", "dela tabletten på mitten".
    unlessDeferred(
      SV_DEFERRAL,
      new RegExp(
        `(?<!\\b(?:inte|ej|aldrig)\\s)${WORD_START}(?:halvera|minska|dela|klyva|skär)\\s+${SV_SLOT}${med}(?:\\s+(?:på\\s+mitten|i\\s+två|till\\s+hälften))?`,
        "i",
      ),
    ),
    unlessDeferred(
      SV_DEFERRAL,
      new RegExp(
        `(?<!\\b(?:inte|ej|aldrig)\\s)\\b(?:ta|använd)\\s+(?:bara\\s+|endast\\s+)?(?:halva\\s+(?:dosen?|tabletterna?)|(?:en\\s+)?halva|(?:den\\s+)?hälften\\s+av\\s+(?:den\\s+din\\s+)?(?:dosen?|tabletterna?))`,
        "i",
      ),
    ),
    // A bare change imperative on a medication, no target: "sänk dosen.",
    // "höj insulinet lite." Swedish definite form ("dosen", "insulinet")
    // rides inside the noun, so the noun plus a two-letter tail is allowed
    // before the anchor.
    unlessDeferred(
      SV_DEFERRAL,
      new RegExp(
        `(?<!\\b(?:inte|ej|aldrig)\\s)${WORD_START}(?:höj|öka|sänk|minska)\\b\\s+(?:(?:din|ditt|dina|den|det|de)\\s+)?${SV_SLOT}(?:${med})\\w{0,3}(?=\\s*(?:[.!?;:)]|$)|\\s+(?:nu|idag|imorgon|lite|gradvis|från\\s+och\\s+med)(?![\\w\\u00C0-\\u024F]))`,
        "i",
      ),
    ),
  ],
  dose: [
    // höj / öka dosen till N unit
    new RegExp(
      `${WORD_START}(?:höj|öka|gå\\s+upp\\s+till)\\b\\s+(?:den\\s+|din\\s+|ditt\\s+)?(?:dos\\w*\\s+)?(?:till|på|med)\\s+[\\d.,]+\\s*${DOSE_UNIT}${UNIT_END}`,
      "i",
    ),
    // sänk / minska dosen till N unit
    new RegExp(
      `\\b(?:sänk|minska|gå\\s+ner\\s+till)\\b\\s+(?:den\\s+|din\\s+|ditt\\s+)?(?:dos\\w*\\s+)?(?:till|på|med)\\s+[\\d.,]+\\s*${DOSE_UNIT}${UNIT_END}`,
      "i",
    ),
    // A recommending cue in front of a drug amount. `ml` is left out: "testa
    // dricka 2000 ml vatten per dag" is hydration advice.
    new RegExp(
      `${WORD_START}(?:överväg|prova|testa|du\\s+borde|du\\s+bör|rekommenderar|föreslår)\\b[^.?!]{0,40}\\b[\\d.,]+\\s*${DRUG_UNIT}${UNIT_END}`,
      "i",
    ),
    new RegExp(
      `\\b(?:nästa|kommande)\\s+(?:dos\\w*|steg)\\b[^.?!]{0,30}\\b[\\d.,]+\\s*${DOSE_UNIT}${UNIT_END}`,
      "i",
    ),
    /\b(?:dubbl\w*|fördubbl\w*|hoppa\s+(?:över|in)|paus\w*|avbryt\w*|sluta\s+ta)\b[^.?!]{0,25}\b(?:dos\w*|tabletter?|medicin\w*|läkemedel|insulin|injektion\w*)[^.?!]{0,40}\b(?:i\s+(?:\d+|en|ett|två|tre|fyra)\s+(?:dagar?|veckor?|månad\w*)|för\s+att\s+(?:se|testa|prova))\b/i,
  ],
  risk: [
    /\brisken?\s+(?:på|är|ligger\s+på|hamnar\s+på)\s+(?:cirka\s+|omkring\s+|runt\s+|~)?\d{1,3}\s*%/i,
    /\b\d{1,3}\s*%\s+(?:risk|sannolikhet|chans)/i,
    new RegExp(`\\b${RISK_NOUN_SV}\\b[^.?!]{0,40}\\d{1,3}\\s*%`, "i"),
    new RegExp(`\\d{1,3}\\s*%[^.?!]{0,40}\\b${RISK_NOUN_SV}\\b`, "i"),
    new RegExp(`\\b${RISK_NOUN_SV}\\b[^.?!]{0,40}\\b${PCT_WORD_SV}\\b`, "i"),
    new RegExp(`\\b${PCT_WORD_SV}\\b[^.?!]{0,40}\\b${RISK_NOUN_SV}\\b`, "i"),
    new RegExp(`\\b${HORIZON_SV}\\b[^.?!]{0,40}${QUAL_NUM_SV}`, "i"),
    new RegExp(`${QUAL_NUM_SV}[^.?!]{0,40}\\b${HORIZON_SV}\\b`, "i"),
    new RegExp(`\\b${ENGINE}\\b[^.?!]{0,50}${QUAL_NUM_SV}`, "i"),
    new RegExp(`${QUAL_NUM_SV}[^.?!]{0,50}\\b${ENGINE}\\b`, "i"),
    new RegExp(
      `\\b(?:${ENGINE}|${HORIZON_SV})\\b[^.?!]{0,60}${RESULT_VERB_SV}`,
      "i",
    ),
    new RegExp(
      `\\b(?:${ENGINE}|${HORIZON_SV})\\b[^.?!]{0,60}${RISK_BAND_SV}`,
      "i",
    ),
    new RegExp(
      `\\b(?:${ENGINE}|${HORIZON_SV})\\b[^.?!]{0,40}${RISK_VERDICT_SV}`,
      "i",
    ),
  ],
  causal: [
    /\beftersom\b/i,
    /\bpå\s+grund\s+av\b/i,
    /\bpga\.?\b/i,
    /\bdärför\s+att\b/i,
    /\borsak\w*/i,
    /\bförorsak\w*/i,
    /\bber(?:or|odde)\s+på/i,
    /\bled(?:er|de)\s+till\b/i,
    /\bresulter(?:ar|ade)\s+i\b/i,
    /\btill\s+följd\s+av\b/i,
    /\btack\s+vare\b/i,
  ],
  continuation:
    /\b(?:forts(?:ätt|etta)\s+(?:ta|med|att\s+ta)|bibehåll\w*|enligt\s+(?:recept\w*|föreskrivning|överenskommelse|anvisning)|som\s+(?:ordinerat|preskriberat|vanligt|tidigare|förr)|precis\s+som\s+(?:vanligt|tidigare))\b/i,
  changeStem: new RegExp(
    `${WORD_START}(?:höj|ök|sänk|minsk|halver|dubbl|fördubbl|paus|avbr|utelämn|hoppa\\s+över|strunta\\s+i|sluta\\s+(?:ta|med)|lägg\\s+av)\\w*`,
    "i",
  ),
};
