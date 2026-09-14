---
name: build-and-verify-docs
description: Build, preview, and verify the workshop site. Use before committing or updating a PR, when checking rendered content or links, or when reviewing structural drift. Derive affected routes and locales from the current source and configuration rather than fixed page counts.
---

# Build and verify the docs site

Lesson source lives in `docs/`; the Astro + Starlight publisher lives in `website/`. This skill owns the build and verification procedure. Other authoring guidance should link here instead of repeating commands or expected output totals.

Use the bundled Node.js entry point for deterministic checks. It derives the repository from its own location, so it also works when invoked by absolute path from another directory. The examples below use Bash from the repository root. Use existing dependencies and tools; ask before installing anything missing.

## Local preview

```bash
(cd website && npm run dev)
```

Open the local URL printed by the server, using the base path configured in `website/astro.config.mjs`. Stop the server you started when finished. Do not reuse or stop an unrelated server.

## Verification before committing

### Run the deterministic checks

```bash
node .github/skills/build-and-verify-docs/scripts/verify.mjs
```

The default `all` mode runs the existing `website/package.json` scripts (`check:all`, then `build`), safely cleans `website/dist`, verifies every source-derived page, and runs offline Lychee. It preserves subprocess output and exit codes. Missing tools, missing artifacts, unsafe configuration, unsupported content, or mismatches fail explicitly; stop and resolve failures before committing.

The scripts use the actual content loader and Astro integration hooks to capture parsed entries, generated IDs/slugs, resolved locales/base path, and intentional static routes. They do not parse configuration with regular expressions or maintain a parallel file inventory. The capture hooks are inactive during ordinary builds. Verification caches stay under the worktree's `website/.astro/`, not shared dependencies.

The deterministic checks cover:

- Expected versus actual HTML routes, including missing pages and unexpected stale/support pages. Static extras such as redirects and error pages come from Astro's resolved routes.
- Localized versus default-locale fallback sources, document language, title/H1, ordered headings, normalized visible prose and image alternative text, and exact code-block contents including indentation and blank lines.
- Unconverted GitHub admonition markers outside code examples.
- Offline internal links and images using a unique temporary root mapped to the configured base path. Temporary directories are removed on success or failure.

Markdown/frontmatter parsing uses the declared `@astrojs/markdown-remark` public API; full-document HTML parsing uses the directly declared `hast-util-from-html` dependency. Code extraction supports plain code blocks and the site's Expressive Code output; unsupported line structures fail rather than guessing.

### Select a narrower operation

Use `build` for type checks, a clean build, and source-to-output verification without Lychee. Use `links` to recheck an existing build; it runs the package's Astro sync command to resolve current configuration, but does not rebuild or certify source/output freshness.

```bash
node .github/skills/build-and-verify-docs/scripts/verify.mjs build
node .github/skills/build-and-verify-docs/scripts/verify.mjs links
```

These scripts target the current static Starlight site with directory-format HTML in `website/dist`. MDX, alternate Markdown processors, unknown prerendered dynamic routes, and manual/domain locale routing fail explicitly until supported with tests. They are tested on macOS/POSIX; native Windows is not supported. They do not install tools, start servers, manage ports, or change running processes.

### Maintain the scripts

Run the bundled tests after changing verification logic:

```bash
node --test .github/skills/build-and-verify-docs/scripts/verify.test.mjs
```

Tests include deliberate mismatches and real fixture builds with added lessons, slugs, translations, locales, changed base paths, filenames and directories containing spaces, and another working directory. The fixtures reuse installed dependencies without installing packages and remove their own temporary files.

## AI review after the scripts pass

Use judgment for semantic accuracy, teaching flow, translation quality, intentional harness differences, and whether navigation or a redirect leads to the right next task. Scripts verify what is present, not whether the lesson is pedagogically correct.

Use the [browser validation skill][browser-validation] when layout, styling, client-side behavior, console errors, or visual image loading requires review. The existing plain-div admonition rendering is not fixed or certified by the raw-marker check; styling still needs browser judgment. Offline checks do not verify external destinations; open changed external links separately and confirm they are the intended resource. Report blocked checks honestly.

## Consistency before updating a PR

- Search for references to paths, names, or conventions changed by the diff, including repository guidance and navigation. Update affected references without rewriting unrelated documentation.
- For duplicated lesson content, use the [content alignment skill][content-alignment] to identify parallel passages and translations that may need matching changes.
- Keep descriptions of build commands and CI behavior consistent with `website/package.json` and `.github/workflows/pages.yml`. Those files, not copied prose, define what runs.

The Pages workflow runs type checks, the build, and offline link validation; deployment is restricted to pushes to `main`. The bundled source-to-output verification, browser validation, and content-alignment review are separate from that build job. Consult the workflow for its current triggers and steps.

[browser-validation]: ../validate-site-playwright/SKILL.md
[content-alignment]: ../check-content-alignment/SKILL.md
