# HealthLog: svensk glossary (låst)

Gäller varje svensk sträng i `messages/sv.json` och i kodbunten. Läs den
före redigering; ändra en term här först, sedan i strängarna. Termerna är
låsta så att samma sak heter samma sak överallt, i alla vyer, i coachen,
i Telegramboten och i rapporterna.

## Grundprinciper

- Tilltal: alltid du, aldrig ni för en enskild läsare.
- Inga tankstreck. Använd kolon, komma eller punkt.
- å, ä och ö skrivs alltid ut. Aldrig aa, ae, oe.
- Rubriker i sentence case. Aldrig CamelCase i löptext.
- `{placeholders}` kopieras oförändrade, med exakt samma namn: value, count,
  date och så vidare. Ett saknat eller omskrivet placeholder är ett byggfel.
- Enheter, koder och enumvärden översätts aldrig: mg, ml, mmol, procent, IE,
  kcal, HbA1c, BMI. Kodvärden som HOME, WORK, SEVERE står i koden och
  wordas av glossariets kolumn nedan.
- Läkemedelsnamn (substansnamn) översätts aldrig: metformin, ramipril,
  amlodipin. Likaså instrumentnamnen: PHQ-9, GAD-7, WHO-5, SCI.
- Medicinska termer följer svenska kliniska riktlinjer och 1177:s ordval.
  Vid tvåljudsval vinner det ord vårdpersonal använder i tal med patienter.

## Låsta termer

| Engelska             | Svenska                  | Not                             |
| -------------------- | ------------------------ | ------------------------------- |
| measurement          | mätning                  |                                 |
| reading              | mätvärde                 | en enskild avläsning            |
| blood pressure       | blodtryck                |                                 |
| systolic / diastolic | systoliskt / diastoliskt |                                 |
| resting heart rate   | vilopuls                 |                                 |
| pulse / heart rate   | puls                     |                                 |
| weight               | vikt                     |                                 |
| body fat             | kroppsfett               |                                 |
| waist                | midja                    |                                 |
| blood glucose        | blodsocker               |                                 |
| glucose              | glukos                   | CGM- och kontinuerliga värden   |
| SpO2                 | syresättning             |                                 |
| respiratory rate     | andningsfrekvens         |                                 |
| sleep                | sömn                     |                                 |
| sleep duration       | sömnlängd                |                                 |
| mood                 | stämning                 | sektionen och loggen            |
| stress               | stress                   | stämningsdimension              |
| energy               | energi                   | stämningsdimension              |
| medication           | läkemedel                |                                 |
| dose                 | dos                      |                                 |
| intake               | intag                    | ett dostillfälle                |
| schedule             | doseringsschema          |                                 |
| skip a dose          | hoppa över en dos        |                                 |
| lab result           | provsvar                 |                                 |
| biomarker            | biomarkör                |                                 |
| reference range      | referensintervall        |                                 |
| panel                | panel                    | labbpanel                       |
| vaccination          | vaccination              |                                 |
| illness episode      | sjukdomsepisod           |                                 |
| symptom              | symtom                   | alltid symtom, aldrig symptom   |
| severity             | svårighetsgrad           |                                 |
| intensity            | intensitet               | 0 till 10-skalan                |
| cycle                | cykel                    | menstruationscykeln             |
| period               | mens                     | blödningen                      |
| workout              | träningspass             |                                 |
| exertion             | ansträngning             | funktionen: vardagsansträngning |
| acute event          | akut händelse            | funktionen: dagens stressorer   |
| check-in             | kvällscheck-in           | funktionens namn                |
| timeline             | tidslinje                |                                 |
| dashboard            | översikt                 | startsidan                      |
| insights             | insikter                 | AI- och trendytan               |
| coach                | coach                    | AI-coachen, orört ord           |
| correlation          | samband                  |                                 |
| doctor report        | läkarrapport             |                                 |
| document vault       | dokumentarkiv            |                                 |
| share                | dela                     | delegering och länkar           |
| delegate             | ombud                    | den som fått åtkomst            |
| onboarding           | introduktion             |                                 |
| settings             | inställningar            |                                 |
| profile              | profil                   |                                 |
| admin                | administratör            |                                 |
| export               | export                   |                                 |
| backup               | säkerhetskopiering       |                                 |
| reminder             | påminnelse               |                                 |
| streak               | svit                     | sammanhängande dagar            |
| adherence            | efterlevnad              | hur dosen följts                |

## Krisresurser (Sverige)

- 112: nödläge, alltid först.
- Mind Självmordslinjen: 90101, mind.sjalvmordslinjen.se.
- 1177 Vårdguiden: 1177, 1177.se.

## Formulär (PHQ-9, GAD-7, WHO-5, SCI)

Formulärtexterna står inte i språkfilerna utan i
`src/lib/mental-health/wording/<instrument>/sv.ts`. Den svenska versionens
validerade ordlydelse ska ersätta HealthLog-översättningen ord för ord, med
källan angiven, så snart den är verifierad mot publikation. Fram till dess
visas en notis om oväljerad översättning.
