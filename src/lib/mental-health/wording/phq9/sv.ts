/**
 * PHQ-9, Swedish: HealthLog's own translation, faithful to the English
 * original and on the same scale (validated: false).
 *
 * A validated Swedish PHQ-9 exists (the PHQ family is published with
 * sanctioned translations and Swedish versions circulate in Swedish care),
 * but its word-for-word text could not be verified against a source
 * document when this file was written, and guessing at a validated
 * instrument's wording is the one mistake the wording policy exists to
 * prevent. This file is therefore HealthLog's own translation: the result
 * reads as orientation, the English original is one tap away, and the
 * administration records that it was answered in an unvalidated
 * translation. Replacing it with the published validated Swedish text
 * word for word, with its source named, is the planned upgrade.
 */
import type { InstrumentWording } from "../types";

const wording: InstrumentWording = {
  validated: false,
  stems: {
    period:
      "Under de senaste 2 veckorna, hur ofta har du besvärats av något av följande problem?",
  },
  items: [
    "Lite intresse eller glädje inför att göra saker",
    "Att känna sig nedstämd, deprimerad eller hopplös",
    "Svårt att somna eller att sova klart, eller att sova för mycket",
    "Att känna sig trött eller ha lite energi",
    "Dålig aptit eller att äta för mycket",
    "Att känna sig dålig i självkänslan, eller att du är en misslyckad människa eller har svikit dig själv eller din familj",
    "Svårt att koncentrera sig på saker, till exempel att läsa tidningen eller se på tv",
    "Att röra eller tala så långsamt att andra människor kan ha lagt märke till det. Eller tvärtom: att du är rastlös eller inte kan hålla dig still, så att du rört dig mycket mer än vanligt",
    "Tankar på att det vore bättre om du inte levde, eller på att skada dig själv på något sätt",
  ],
  anchors: {
    all: {
      0: "Inte alls",
      1: "Några dagar",
      2: "Mer än hälften av dagarna",
      3: "Nästan varje dag",
    },
  },
  functional: {
    title:
      "Om du kryssat i något av problemen: hur mycket har de gjort det svårare för dig att sköta ditt arbete, ta hand om saker hemma eller komma överens med andra människor?",
    anchors: {
      0: "Inget alls svårt",
      1: "Något svårt",
      2: "Mycket svårt",
      3: "Extremt svårt",
    },
  },
};

export default wording;
