/**
 * GAD-7, Swedish: HealthLog's own translation, faithful to the English
 * original and on the same scale (validated: false).
 *
 * A validated Swedish GAD-7 exists (the GAD-7 is published with sanctioned
 * translations and Swedish versions circulate in Swedish care), but its
 * word-for-word text could not be verified against a source document when
 * this file was written, and guessing at a validated instrument's wording
 * is the one mistake the wording policy exists to prevent. This file is
 * therefore HealthLog's own translation: the result reads as orientation,
 * the English original is one tap away, and the administration records
 * that it was answered in an unvalidated translation. Replacing it with
 * the published validated Swedish text word for word, with its source
 * named, is the planned upgrade.
 */
import type { InstrumentWording } from "../types";

const wording: InstrumentWording = {
  validated: false,
  stems: {
    period:
      "Under de senaste 2 veckorna, hur ofta har du besvärats av följande besvär?",
  },
  items: [
    "Nervositet, oro eller spänning",
    "Inte kunna sluta eller kontrollera oro",
    "Att oroa sig för mycket för olika saker",
    "Svårt att slappna av",
    "Rastlöshet, så att det är svårt att sitta still",
    "Att bli irriterad eller arg lätt",
    "Oro med känslan av att något hemskt kan hända",
  ],
  anchors: {
    all: {
      0: "Inte alls",
      1: "Några dagar",
      2: "Mer än hälften av dagarna",
      3: "Nästan varje dag",
    },
  },
};

export default wording;
