/**
 * WHO-5, Swedish: HealthLog's own translation, faithful to the English
 * original and on the same scale (validated: false).
 *
 * A validated Swedish WHO-5 exists (WHO publishes sanctioned translations
 * and Swedish versions of the index are in use in Swedish care), but its
 * word-for-word text could not be verified against the WHO source document
 * when this file was written, and guessing at a validated instrument's
 * wording is the one mistake the wording policy exists to prevent. This
 * file is therefore HealthLog's own translation: the result reads as
 * orientation, the English original is one tap away, and the
 * administration records that it was answered in an unvalidated
 * translation. Replacing it with the published validated Swedish text
 * word for word, with its source named, is the planned upgrade.
 */
import type { InstrumentWording } from "../types";

const wording: InstrumentWording = {
  validated: false,
  stems: { period: "Under de senaste två veckorna …" },
  items: [
    "Jag har känt mig glad och på gott humör",
    "Jag har känt mig lugn och avslappnad",
    "Jag har känt mig aktiv och pigg",
    "Jag vaknade och kände mig utvilad och utsovit",
    "Min vardag har varit fylld av saker som intresserar mig",
  ],
  anchors: {
    all: {
      0: "Vid inget tillfälle",
      1: "En del av tiden",
      2: "Mindre än hälften av tiden",
      3: "Mer än hälften av tiden",
      4: "Det mesta av tiden",
      5: "Hela tiden",
    },
  },
};

export default wording;
