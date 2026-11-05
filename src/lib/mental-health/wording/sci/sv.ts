/**
 * SCI, Swedish: HealthLog's own translation, faithful to the English
 * original and on the same scale (validated: false).
 *
 * A validated Swedish SCI exists (the Sleep Condition Indicator is
 * published with sanctioned translations, and Swedish versions are in use
 * in Swedish sleep care), but its word-for-word text could not be verified
 * against the source document when this file was written, and guessing at
 * a validated instrument's wording is the one mistake the wording policy
 * exists to prevent. This file is therefore HealthLog's own translation:
 * the result reads as orientation, the English original is one tap away,
 * and the administration records that it was answered in an unvalidated
 * translation. Replacing it with the published validated Swedish text
 * word for word, with its source named, is the planned upgrade.
 */
import type { InstrumentWording } from "../types";

const wording: InstrumentWording = {
  validated: false,
  stems: {
    night: "Om du tänker på en typisk natt under den senaste månaden …",
    impact:
      "Om du tänker på den senaste månaden, i vilken grad har dålig sömn …",
    finally: "Slutligen …",
  },
  items: [
    "… hur lång tid tar det för dig att somna?",
    "… om du sedan vaknar under natten … hur länge är du vaken sammanlagt? (räkna ihop alla uppvaknanden)",
    "… hur många nätter i veckan har du problem med din sömn?",
    "… hur bedömer du din sömnkvalitet?",
    "… påverkat ditt humör, din energi eller dina relationer?",
    "… påverkat din koncentrationsförmåga, produktivitet eller förmåga att hålla dig vaken?",
    "… besvärat dig i allmänhet?",
    "… hur länge har du haft problem med din sömn?",
  ],
  anchors: {
    duration: {
      0: "61 min eller mer",
      1: "46 till 60 min",
      2: "31 till 45 min",
      3: "16 till 30 min",
      4: "0 till 15 min",
    },
    nights: { 0: "5 till 7", 1: "4", 2: "3", 3: "2", 4: "0 till 1" },
    quality: {
      0: "Mycket dålig",
      1: "Dålig",
      2: "Genomsnittlig",
      3: "Bra",
      4: "Mycket bra",
    },
    impact: {
      0: "Mycket mycket",
      1: "Mycket",
      2: "Något",
      3: "Lite",
      4: "Inte alls",
    },
    problemDuration: {
      0: "Mer än 1 år",
      1: "7 till 12 månader",
      2: "3 till 6 månader",
      3: "1 till 2 månader",
      4: "Jag har inget problem / under 1 månad",
    },
  },
};

export default wording;
