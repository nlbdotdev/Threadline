# Spaceflight methodology

Source URLs, SHA-256 hashes, upstream update strings and retrieval time are in
public/data/provenance.json. Raw TSV downloads are temporary and not tracked.
The normalized JSON is the attributed offline source fixture used by the Lab.

## Grain and scope

One event per GCAT Launch_Tag. Include launch codes beginning O (orbital) or D
(deep-space). Exclude second-letter E (pad explosion) and A (pad abort). Failures
and partial successes are included. This gives 7,405 attempts in the checked-in
snapshot, spanning 1957–2026. It is not an exhaustive catalogue of every rocket
ever fired; suborbital, sounding and military rocket scopes are planned separately.

Original Launch_Tag, Launch_Date, LaunchCode, vehicle, pad and site remain in
attributes. Early launch IDs use GCAT's historical Greek designations, not fabricated
modern COSPAR numbers. Partial/approximate date strings are normalized honestly.
The importer fails if a selected milestone ID is absent.

## Country and organization

Join launch Agency to orgs.Code. Composite operator codes are resolved through their documented members. Equal StateCodes collapse to one country; differing countries remain multiple attribute values. Unknown or uncertain members remain unresolved. Country is the resulting source StateCode. Labels use
the source short English name when present, then short/source names. Country codes
are historical source facts as supplied; they are not rewritten to current borders.
Site country is retained separately using sites.StateCode.

Agency means organization responsible for launch services, not payload owner or
mission sponsor. It can be a government agency, military body, center or commercial
provider. Root/branch views use source Parent relationships. Ancestor filters match
descendants. Payload agency and mission operator attribution are not populated.

## Crew

Use McDowell's human-flight mission list, MType=FLT and OrbID starting ORB.
Match UTC launch minute to GCAT launch time within two minutes on the same day;
there must be exactly one candidate. Missing or ambiguous matches stop the import.
All 363 eligible human orbital flights match the checked-in snapshot. Ship transfers,
biological missions and suborbital flights do not enter this join.

Matched attempts are crewed. Unmatched attempts strictly before the human-list
update date (2026-10-08) are uncrewed. On/after that date unmatched attempts are
unknown, since the human table may lag the launch table. This negative classification
assumes upstream human-flight coverage; it is not an independent absence-of-crew
proof. The exact source timestamps and method are visible in the app.

## Outcome

The second LaunchCode letter S/F means propulsive success/failure; digits after it
are partial success fractions and become Partial. Other codes stay Unknown.
Launch outcome does not claim mission success after launch.

## Refresh and reproducibility

Run npm run data:import explicitly to fetch the four source tables. Inspect changes,
then run checks/tests/build. To reproduce from retained downloads, run:

```sh
python3 scripts/import_gcat.py --source-dir /path/to/tsvs
```

Filenames: threadline-launch.tsv, threadline-orgs.tsv, threadline-sites.tsv,
threadline-missions.tsv. Hashes and retrieval time are refreshed in the manifest.
Normal build/test commands never refresh or access the upstream catalogue.
