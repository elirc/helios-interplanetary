# Types, runtime values, and compatibility

Define JournalLine with an explicit DEBIT/CREDIT union and a validated positive cents representation. Then define an AggregatedJournal output whose decimal-string totals are not confused with Number cents. A type alias named Money is insufficient unless its unit and representation are clear.

For metrics, distinguish RouteTemplate from a raw request URL and DurationMs from DurationSeconds in your proposed boundary. Show the conversion exactly once. A branded type can prevent accidental mixing after validation, but cannot make a mislabeled Number truthful.

Make NoSamples a distinct reporting outcome or preserve an empty collection. Do not default missing telemetry to a successful zero-millisecond request. Write compatibility notes for an existing consumer that expects numeric totals before introducing exact decimal strings into any real response.

## Contract worksheet

Write five concrete examples before coding: valid input, missing input, explicitly empty input, wrong primitive type, and a value valid yesterday but stale now. Record whether each is rejected, normalized, ignored, or accepted with a distinct outcome. “TypeScript catches it” is insufficient for JSON, browser storage, events, or a database row returned through an unchecked cast.

Use a discriminated union for outcomes that require different UI behavior. In a TypeScript practice file, make a consumer switch exhaustive and demonstrate which new variant should force a review. In GitJira, use its JSDoc and schema conventions rather than converting the project. Keep proposed type snippets in your practice work until you have verified the actual application contract.

Choose one backwards-compatibility risk: an old caller omits a new field, a saved object has an older shape, or an older client interprets a new outcome as success. Describe a migration or fallback and a test using an old fixture. A renamed property is a contract change even when all currently compiled callers are updated.
