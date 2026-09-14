---
name: build-and-verify-docs
description: Build, preview, and verify the workshop site. Use before committing or updating a PR, when checking rendered content or links, or when reviewing structural drift. Derive affected routes and locales from the current source and configuration rather than fixed page counts.
---

# Build and verify the docs site

Lesson source lives in `docs/`; the Astro + Starlight publisher lives in `website/`. This skill owns the build and verification procedure. Other authoring guidance should link here instead of repeating commands or expected output totals.

Run commands from the repository root. Use existing dependencies and tools; ask before installing anything missing.

## Local preview

```bash
(cd website && npm run dev)
```

Open the local URL printed by the server, using the base path configured in `website/astro.config.mjs`. Stop the server you started when finished. Do not reuse or stop an unrelated server.

## Verification before committing

### 1. Type-check and build

```bash
(cd website && npm run check:all && rm -rf dist && npm run build)
```

Stop on failures and resolve them before committing. Read `website/package.json` when the available commands or their coverage are uncertain.

### 2. Check affected pages

Use the diff to select pages to inspect in `website/dist/`. Derive their expected routes from the source paths and `slug` frontmatter, the content loader in `website/src/content.config.ts`, and the base path and locales in `website/astro.config.mjs`.

- For added or changed lessons, confirm the expected output exists and contains the source title, headings, and changed content. Check that prompts and admonitions render rather than appearing as raw markup.
- For translated pages, compare the output with that locale's source and configured `lang`. English fallback is expected only where a translation is absent; a successful build alone does not prove a translation rendered.
- For renamed or removed pages, check navigation and references against the intended new routes. Check redirects only where they are intentionally provided.
- For changes to shared rendering, the loader, or locale configuration, expand inspection to the affected harnesses and locales. Confirm support assets are not published as lesson pages.

Do not maintain a fixed page count, list of lesson filenames, or expected translated title here. Inspect actual source-to-output behavior; adding a lesson or locale should not require editing this skill. If comprehensive route validation is needed, derive expectations from source and configuration rather than treating a matching total as proof.

Use the [browser validation skill][browser-validation] when visual behavior, client-side rendering, console errors, or image loading needs a deeper check.

### 3. Check internal links

Lychee checks the built HTML offline. The root below maps the site's `/copilot-workshops/` base path to the build; adjust that mapping if the configured base changes. Use a unique temporary directory so concurrent checks do not share it.

```bash
(
set -eu
link_root=$(mktemp -d)
trap 'rm -f "$link_root/copilot-workshops"; rmdir "$link_root"' EXIT
ln -s "$PWD/website/dist" "$link_root/copilot-workshops"
lychee --offline --no-progress --root-dir "$link_root" 'website/dist/**/*.html'
)
```

Resolve broken internal links and images before committing. Offline checks do not verify external URLs; open changed external links separately and confirm the intended destination. Report any checks that remain blocked.

## Consistency before updating a PR

- Search for references to paths, names, or conventions changed by the diff, including repository guidance and navigation. Update affected references without rewriting unrelated documentation.
- For duplicated lesson content, use the [content alignment skill][content-alignment] to identify parallel passages and translations that may need matching changes.
- Keep descriptions of build commands and CI behavior consistent with `website/package.json` and `.github/workflows/pages.yml`. Those files, not copied prose, define what runs.

The Pages workflow runs type checks, the build, and offline link validation; deployment is restricted to pushes to `main`. Source-to-output inspection, browser validation, and content-alignment review are separate from that build job. Consult the workflow for its current triggers and steps.

[browser-validation]: ../validate-site-playwright/SKILL.md
[content-alignment]: ../check-content-alignment/SKILL.md
