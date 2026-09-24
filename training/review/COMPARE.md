# Compare: my findings vs. the model's — Helios raw-SQL review

Fill this in after finishing `training/review/EXERCISE.md` and reading `training/_answers/review.md`.

## Findings I got that the model also got
- (file:line, one line each)

## Findings the model got that I missed
- (file:line, one line each — for each, write **why** you missed it: wrong file, wrong severity instinct,
  didn't check the migrations against the query, didn't trace the OTel path end to end, etc.)

## Findings I got that the model didn't
- (these happen — the model's list isn't exhaustive. Note anything genuinely new.)

## The pattern behind what I missed
- One paragraph: is there a category of bug you consistently under-weight (performance-at-scale vs.
  correctness-today; telemetry/observability vs. business logic; reading a schema file, not just the queries)?

## Score
- Findings found / total staff findings in `_answers/review.md`: ___ / ___
- Severity calibration (did you rank a P1 as a nit, or a style nit as a P1?): ___
