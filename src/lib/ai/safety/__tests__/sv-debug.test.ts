import { describe, it } from "vitest";
import { POPULATION_NORM_PATTERNS } from "@/lib/ai/coach/population-norms";
import { hasPopulationNormFraming } from "@/lib/ai/coach/coach-prose-grounding";

describe("sv debug 9", () => {
  it("debug", () => {
    const s = "De flesta vuxna behöver 7 till 9 timmars sömn.";
    POPULATION_NORM_PATTERNS.sv.forEach((re, i) => {
      console.log(`sv[${i}]:`, re.test(s));
    });
    console.log(
      "framing sv:",
      hasPopulationNormFraming(s, "sv"),
      "as en:",
      hasPopulationNormFraming(s, "en"),
    );
  });
});
