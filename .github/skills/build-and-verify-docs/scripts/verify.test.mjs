import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, cp, symlink, readdir, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expectedPages, compareRoutes, comparePage, extraPages, parsers, sourceContent } from './content.mjs';
import { repository, temporary, safeOutput, validateRoot, baseSegments, run } from './verify.mjs';

const api = await parsers(join(repository, 'website'));
const i18n = {
  defaultLocale: 'en',
  locales: [{ path: 'en', codes: ['en'] }, { path: 'fr', codes: ['fr-FR'] }],
  routing: { prefixDefaultLocale: false },
};
const entry = (id, title = id, draft = false) => ({ id, data: { title, draft } });

test('routes derive from slugs, locale configuration, translations and draft status', () => {
  const entries = [entry('index'), entry('topic/custom'), entry('fr/topic/custom', 'Traduit'), entry('draft', '', true)];
  const pages = expectedPages(entries, i18n);
  assert.equal(pages.get('index.html').lang, 'en');
  assert.equal(pages.get('fr/index.html').fallback, true);
  assert.equal(pages.get('fr/topic/custom/index.html').entry.data.title, 'Traduit');
  assert.equal(pages.get('fr/topic/custom/index.html').fallback, false);
  assert(!pages.has('draft/index.html'));
  const expanded = expectedPages([...entries, entry('new lesson')], {
    ...i18n, locales: [...i18n.locales, { path: 'de', codes: ['de-DE'] }],
  });
  assert.equal(expanded.get('de/new lesson/index.html').lang, 'de-DE');
  assert.equal(expanded.get('de/new lesson/index.html').fallback, true);
  assert.throws(() => expectedPages([entry('../escape')], i18n), /Unsafe route/);
  assert.throws(() => expectedPages([entry('index'), entry('')], i18n), /Duplicate/);
  assert.throws(() => expectedPages(entries, { ...i18n, routing: 'manual' }), /Unsupported locale/);
});

test('missing, removed and support routes are detected, rather than comparing totals', () => {
  const pages = expectedPages([entry('index')], i18n);
  const files = [...pages.keys()];
  compareRoutes(files, pages, new Set());
  assert.throws(() => compareRoutes(files.slice(1), pages, new Set()), /Missing: index.html/);
  for (const extra of ['removed/index.html', '_images/index.html']) {
    assert.throws(() => compareRoutes([...files, extra], pages, new Set()), /Unexpected:/);
  }
  assert.throws(() => compareRoutes([files[0], 'wrong/index.html'], pages, new Set()), /Missing:.*Unexpected:/s);
});

test('intentional static extras come from resolved routes; unknown dynamic pages fail explicitly', () => {
  const collection = {
    pattern: '/[...slug]', params: ['...slug'], type: 'page', isPrerendered: true,
    entrypoint: '@astrojs/starlight/routes/static/index.astro',
  };
  const staticPage = (pathname) => ({ pathname, params: [], type: 'page', isPrerendered: true });
  assert.deepEqual([...extraPages([collection, staticPage('/404'), staticPage('/legacy/moved')])],
    ['404.html', 'legacy/moved/index.html']);
  assert.throws(() => extraPages([{ ...collection, entrypoint: 'src/pages/[...slug].astro' }]), /Unsupported dynamic/);
});

const source = {
  title: 'Fish & chips', headings: [[2, 'Read carefully']], code: ['echo "<ok>"\n\n  keep spacing'],
  prose: 'Read carefully Translated body.',
};
const html = `<!doctype html><html lang="fr-FR"><head><title>Fish &amp; chips | Site</title></head>
<body><h1>Fish &amp; chips</h1><div class="sl-markdown-content"><h2>Read carefully<a class="sl-anchor-link">Permalink</a></h2>
<p>Translated body.</p><div class="expressive-code"><pre><code><div class="ec-line"><div class="code">echo "&lt;ok&gt;"</div></div>
<div class="ec-line"><div class="code">\n</div></div><div class="ec-line"><div class="code">  keep spacing</div></div></code></pre></div></div></body></html>`;

test('HTML5 parsing decodes entities and preserves exact fenced text, blank lines and indentation', () => {
  comparePage(html, { lang: 'fr-FR' }, source, api, 'fixture');
});

for (const [label, before, after, diagnostic] of [
  ['language', 'lang="fr-FR"', 'lang="en"', /language/],
  ['title', '<title>Fish', '<title>Wrong', /document title/],
  ['H1', '<h1>Fish', '<h1>Wrong', /H1/],
  ['heading', '<h2>Read', '<h2>Wrong', /headings/],
  ['fenced prompt', 'keep spacing', 'changed prompt', /code block/],
  ['fenced indentation', '  keep spacing', 'keep spacing', /code block/],
  ['translation content', 'Translated body.', 'English fallback.', /source prose/],
  ['raw admonition', 'Translated body.', '[!TIP] Translated body.', /source prose|admonition/],
]) {
  test(`rejects ${label} mismatch`, () => {
    assert.throws(() => comparePage(html.replace(before, after), { lang: 'fr-FR' }, source, api, 'fixture'), diagnostic);
  });
}

test('source frontmatter uses the public YAML parser; exact code and entity-rich headings are derived', async () => {
  await temporary('workshop-source-', async (directory) => {
    const website = join(directory, 'website');
    await mkdir(website);
    const markdown = '---\ntitle: >-\n  Fish & chips\n---\n## Read *carefully*\n\nTranslated body.\n\n```text\necho "<ok>"\n\n  keep spacing\n```\n';
    await writeFile(join(directory, 'a file.md'), markdown);
    const parsed = api.parseFrontmatter(markdown);
    const data = { filePath: '../a file.md', body: parsed.content, data: parsed.frontmatter };
    assert.deepEqual(await sourceContent(data, website, api, {}), source);
    await assert.rejects(sourceContent({ ...data, body: 'stale' }, website, api, {}), /changed since capture/);
    await assert.rejects(sourceContent({ ...data, filePath: '../a.mdx' }, website, api, {}), /Unsupported source type/);
  });
});

test('wrong roots, unsafe output paths, symlinks, missing artifacts and unsafe base paths fail', async () => {
  await temporary('workshop-safety-', async (directory) => {
    await assert.rejects(validateRoot(directory), /ENOENT/);
    const website = join(directory, 'website');
    await mkdir(website);
    const config = {
      root: pathToFileURL(`${website}/`).href, outDir: pathToFileURL(`${website}/dist/`).href,
      output: 'static', format: 'directory',
    };
    assert.equal(await safeOutput(website, config), join(website, 'dist'));
    await assert.rejects(safeOutput(website, config, true), /ENOENT/);
    await assert.rejects(safeOutput(website, { ...config, outDir: config.root }), /Refusing to clean/);
    await symlink(directory, join(website, 'dist'));
    await assert.rejects(safeOutput(website, config), /symlink/);
    for (const base of ['../bad', '/../../', '/a\\b/', '/%2e%2e/']) assert.throws(() => baseSegments(base));
    assert.deepEqual(baseSegments('/nested/site/'), ['nested', 'site']);
    assert.deepEqual(baseSegments('/'), []);
  });
});

test('native subprocess exit codes are preserved; missing tools fail explicitly', () => {
  assert.throws(() => run(process.execPath, ['-e', 'process.exit(7)']), (error) => error.exitCode === 7);
  assert.throws(() => run('/nonexistent/workshop-verification-tool', []), /Cannot run/);
});

test('script-owned temporary directories are cleaned on success and failure without following symlinks', async () => {
  let removed;
  await temporary('workshop-outer-', async (outside) => {
    const sentinel = join(outside, 'keep');
    await writeFile(sentinel, 'unchanged');
    await assert.rejects(temporary('workshop-inner-', async (directory) => {
      removed = directory;
      await symlink(outside, join(directory, 'link'));
      throw new Error('deliberate failure');
    }), /deliberate/);
    assert.equal(await readFile(sentinel, 'utf8'), 'unchanged');
  });
  await assert.rejects(lstat(removed), /ENOENT/);
});

test('real entry point builds dynamic lesson/locale fixtures from another cwd with spaces', { timeout: 600000 }, async () => {
  await mkdir(join(repository, 'website/.astro'), { recursive: true });
  await temporary('workshop fixture ', async (fixture) => {
    const website = join(fixture, 'website');
    const scripts = join(fixture, '.github/skills/build-and-verify-docs/scripts');
    await mkdir(join(website, 'src'), { recursive: true });
    await mkdir(join(fixture, 'docs/_support'), { recursive: true });
    await mkdir(join(fixture, 'temp area'));
    await cp(join(repository, '.github/skills/build-and-verify-docs/scripts'), scripts, { recursive: true });
    for (const file of ['package.json', 'tsconfig.json', 'tsconfig.tsgo.json', 'src/content.config.ts']) {
      await cp(join(repository, 'website', file), join(website, file));
    }
    await cp(join(repository, 'website/src/pages'), join(website, 'src/pages'), { recursive: true });
    await cp(join(repository, 'website/public'), join(website, 'public'), { recursive: true });
    await symlink(join(repository, 'website/node_modules'), join(website, 'node_modules'), 'dir');
    const config = (locales) => `
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import { verificationIntegration } from '../.github/skills/build-and-verify-docs/scripts/capture.mjs';
export default defineConfig({ site: 'https://example.test', base: '/nested/workshop', trailingSlash: 'always',
  markdown: { processor: unified() },
  integrations: [verificationIntegration(), starlight({title: 'Fixture', locales: ${JSON.stringify(locales)}})] });
`;
    const locales = { root: { label: 'English', lang: 'en' }, fr: { label: 'French', lang: 'fr-FR' } };
    await writeFile(join(website, 'astro.config.mjs'), config(locales));
    await writeFile(join(fixture, 'docs/README.md'), '---\ntitle: Home\nslug: index\n---\n## Start\n\nWelcome.\n');
    await writeFile(join(fixture, 'docs/a file.md'), '---\ntitle: Lesson\nslug: custom-route\n---\n## Task\n\nDo this.\n\n```text\nprompt & <literal>\n\n  indentation\n```\n');
    await writeFile(join(fixture, 'docs/_support/hidden.md'), '---\ntitle: Must not be routed\n---\n');
    const invoke = (mode, expectedStatus = 0) => {
      const started = performance.now();
      const result = spawnSync(process.execPath, [join(scripts, 'verify.mjs'), mode], {
        cwd: join(fixture, 'temp area'), encoding: 'utf8', maxBuffer: 5_000_000,
        env: { ...process.env, TMPDIR: join(fixture, 'temp area') },
      });
      assert.equal(result.status, expectedStatus, `${result.stdout}\n${result.stderr}`);
      console.log(`Fixture ${mode}: exit ${result.status}, ${Math.round(performance.now() - started)} ms`);
      return result.stdout;
    };
    assert.match(invoke('build'), /Verified .* source-derived pages/);
    assert((await lstat(join(website, 'dist/fr/custom-route/index.html'))).isFile());
    await mkdir(join(fixture, 'docs/fr'));
    await writeFile(join(fixture, 'docs/fr/a file.md'), '---\ntitle: Leçon\nslug: fr/custom-route\n---\n## Travail\n\nTexte traduit.\n');
    await writeFile(join(fixture, 'docs/new lesson.md'), '---\ntitle: New lesson\n---\n## New task\n\nNew work.\n');
    await writeFile(join(website, 'astro.config.mjs'), config({ ...locales, de: { label: 'German', lang: 'de-DE' } }));
    assert.match(invoke('all'), /Verified .* source-derived pages/);
    const translated = await readFile(join(website, 'dist/fr/custom-route/index.html'), 'utf8');
    assert.match(translated, /Texte traduit/);
    assert((await lstat(join(website, 'dist/de/new-lesson/index.html'))).isFile());
    await writeFile(join(website, 'dist/fr/custom-route/index.html'),
      translated.replace('</body>', '<a href="/nested/workshop/missing/">Broken</a></body>'));
    invoke('links', 2);
    assert.deepEqual((await readdir(join(fixture, 'temp area'))).filter((name) => name.startsWith('workshop-')), []);
    // Removing the source must also remove its old output on the next clean build.
    await rm(join(fixture, 'docs/new lesson.md'));
    invoke('build');
    await assert.rejects(lstat(join(website, 'dist/de/new-lesson/index.html')), /ENOENT/);
  }, join(repository, 'website/.astro'));
});
