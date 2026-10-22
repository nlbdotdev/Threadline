# Threadline Lab

- Read README.md and the relevant docs before changing the component or schema.
- Svelte component support and documentation are first-class. Keep all selectors,
  date formatting, validation and rail assignment framework-neutral for future
  React and Vue adapters.
- Run commands here, using npm and the committed lockfile. No root orchestration.
- Update docs and the live documentation app alongside public API changes.
- Dates are source facts. Never fabricate precision, crew status or agency ownership.
- Preserve the source fixture's license/provenance. Refresh upstream data only
  explicitly; ordinary builds and tests must remain offline.
- Validate meaningful semantic changes with npm run check, npm test and npm run build.
- Keep package/, dist/, dependencies and browser artifacts untracked.
- The demo and documentation deploy to https://threadline.nlb.dev from this repository.
- Do not publish the npm package without an explicit request.
