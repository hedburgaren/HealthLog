/**
 * Population-norm framing, sv.
 *
 * Every entry needs a population subject or a reference noun: a reading of
 * the reader's own ("Ditt blodtryck på 158/97 ligger oftast…", "Din läkare
 * rekommenderar…") is a claim about their data, and an exempted sentence is
 * one whose numbers are never checked.
 */
export const patterns: readonly RegExp[] = [
  /\breferens(?:intervall|värden|värde)\b/i,
  /\bnorm(?:alt|ala)?\s+(?:intervall|värden)\b/i,
  /\b(?:friska\s+)?(?:vuxna|personer|människor)\b/i,
  /\b(?:de\s+)?(?:flesta|majoriteten\s+av\s+(?:de\s+)?(?:vuxna|personerna))\b/i,
  /\b(?:riktlinjer|läkare|experter)\s+(?:i\s+allmänhet\s+|ofta\s+|vanligtvis\s+)?(?:anger|rekommenderar|råder|anser|skriver)\b/i,
  /\b(?:vuxna|personer)\s+(?:behöver|bör)\b/i,
  /\b(?:vilopuls|blodtryck|blodsocker|glukos|kroppsvikt)\s+(?:är\s+)?(?:normalt|normala|friska|vanliga|typiska)\b/i,
];
