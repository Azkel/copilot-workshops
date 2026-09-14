import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function parsers(website) {
  const require = createRequire(pathToFileURL(join(website, 'package.json')));
  const markdown = await import(require.resolve('@astrojs/markdown-remark'));
  const { fromHtml } = await import(require.resolve('hast-util-from-html'));
  return { ...markdown, fromHtml };
}

export function elements(node, predicate) {
  const result = [];
  function visit(current) {
    if (current.type === 'element' && predicate(current)) result.push(current);
    for (const child of current.children ?? []) visit(child);
  }
  visit(node);
  return result;
}

const hasClass = (node, name) => node.properties?.className?.includes(name);
const words = (value) => value.replace(/\s+/gu, ' ').trim();
const lines = (value) => value.replace(/\r\n?/g, '\n');

function text(node) {
  if (node.type === 'text') return node.value;
  if (node.tagName === 'br') return '\n';
  if (node.tagName === 'img') return node.properties?.alt ?? '';
  // Starlight adds accessible permalink labels which are not part of source headings.
  if (node.tagName === 'a' && hasClass(node, 'sl-anchor-link')) return '';
  return (node.children ?? []).map(text).join('');
}

function headings(tree) {
  return elements(tree, (node) => /^h[1-6]$/.test(node.tagName))
    .map((node) => [Number(node.tagName[1]), words(text(node))]);
}

function prose(node, stripMarkers = false, inCode = false) {
  if (['pre', 'style', 'script', 'svg'].includes(node.tagName) || hasClass(node, 'expressive-code') ||
    (node.tagName === 'a' && hasClass(node, 'sl-anchor-link'))) return '';
  if (node.type === 'text') return stripMarkers && !inCode
    ? node.value.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, '') : node.value;
  if (node.tagName === 'img') return node.properties?.alt ?? '';
  const value = (node.children ?? []).map((child) => prose(child, stripMarkers, inCode || node.tagName === 'code')).join('');
  return ['p', 'div', 'li', 'td', 'th', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)
    ? ` ${value} ` : value;
}

function codeBlocks(tree) {
  return elements(tree, (node) => node.tagName === 'pre').map((pre) => {
    const codes = elements(pre, (node) => node.tagName === 'code');
    assert.equal(codes.length, 1, 'Unsupported code block: expected one <code> per <pre>.');
    const code = codes[0];
    const expressiveLines = elements(code, (node) => hasClass(node, 'ec-line'));
    if (expressiveLines.length) {
      return expressiveLines.map((line) => {
        const content = elements(line, (node) => hasClass(node, 'code'));
        assert.equal(content.length, 1, 'Unsupported Expressive Code line structure.');
        const value = text(content[0]);
        // Expressive Code uses a single newline as the placeholder for an empty visual line.
        if (value === '\n') return '';
        assert(!value.includes('\n'), 'Unsupported multiline Expressive Code line.');
        return value;
      }).join('\n');
    }
    assert.equal(elements(code, (node) => ['div', 'table'].includes(node.tagName)).length, 0,
      'Unsupported code renderer: cannot infer line breaks.');
    return lines(text(code)).replace(/\n$/, '');
  });
}

export function routeFile(id) {
  const route = id === 'index' ? '' : id.replace(/\/index$/, '').normalize();
  assert(!route.startsWith('/') && !route.includes('\\') && !/[?#%]/.test(route),
    `Unsupported route slug: ${id}`);
  assert(!route.split('/').some((part) => part === '.' || part === '..'), `Unsafe route slug: ${id}`);
  return route ? `${route}/index.html` : 'index.html';
}

export function expectedPages(entries, i18n) {
  assert(i18n && Array.isArray(i18n.locales) && i18n.locales.length, 'Missing resolved locale configuration.');
  assert(i18n.routing !== 'manual' && !i18n.domains, 'Unsupported locale routing: manual routing or domains.');
  const locales = i18n.locales.map((locale) => typeof locale === 'string'
    ? { path: locale, lang: locale }
    : { path: locale.path, lang: locale.codes[0] });
  const defaultLocale = locales.find((locale) => locale.path === i18n.defaultLocale);
  assert(defaultLocale, 'Default locale is not configured.');
  if (!i18n.routing.prefixDefaultLocale) defaultLocale.path = '';
  for (const locale of locales) {
    assert(typeof locale.lang === 'string' && locale.lang.length, 'Locale requires a language tag.');
    routeFile(locale.path);
  }
  const localized = (id) => locales.find((locale) =>
    locale.path && (id === locale.path || id.startsWith(`${locale.path}/`))) ??
    locales.find((locale) => locale.path === '');
  const pages = new Map();
  const add = (id, entry, locale, fallback) => {
    const file = routeFile(id);
    assert(!pages.has(file), `Duplicate output route: ${file}`);
    pages.set(file, { entry, lang: locale.lang, fallback });
  };
  const published = entries.filter((entry) => !entry.data.draft);
  assert(published.length, 'No published source entries were captured.');
  for (const entry of published) {
    assert(typeof entry.id === 'string' && typeof entry.data.title === 'string', 'Invalid captured source entry.');
    const id = entry.id === 'index' ? '' : entry.id;
    const locale = localized(id);
    assert(locale, `Source does not belong to a configured locale: ${entry.id}`);
    add(id, entry, locale, false);
  }
  for (const entry of published) {
    const id = entry.id === 'index' ? '' : entry.id;
    if (localized(id) !== defaultLocale) continue;
    const suffix = defaultLocale.path ? id.slice(defaultLocale.path.length).replace(/^\//, '') : id;
    for (const locale of locales) {
      const target = [locale.path, suffix].filter(Boolean).join('/');
      if (!pages.has(routeFile(target))) add(target, entry, locale, true);
    }
  }
  return pages;
}

export function extraPages(routes) {
  const extras = new Set();
  let collectionRoute = false;
  for (const route of routes) {
    if (route.type === 'endpoint' || !route.isPrerendered) continue;
    if (route.params.length) {
      assert(route.pattern === '/[...slug]' &&
        route.entrypoint.includes('@astrojs/starlight/routes/static/index.astro'),
      `Unsupported dynamic page route: ${route.pattern} (${route.entrypoint})`);
      collectionRoute = true;
      continue;
    }
    assert(typeof route.pathname === 'string', `Missing static pathname: ${route.pattern}`);
    const pathname = route.pathname.replace(/^\/|\/$/g, '');
    // Astro emits its special 404/500 routes as files, regardless of build.format.
    extras.add(['404', '500'].includes(pathname) ? `${pathname}.html` : routeFile(pathname));
  }
  assert(collectionRoute, 'The resolved Starlight collection route was not found.');
  return extras;
}

export async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Unexpected symlink in build output: ${join(directory, entry.name)}`);
    if (entry.isDirectory()) {
      for (const child of await htmlFiles(join(directory, entry.name))) files.push(`${entry.name}/${child}`);
    } else if (entry.name.endsWith('.html')) files.push(entry.name);
  }
  return files;
}

export function compareRoutes(actual, pages, extras) {
  const expected = new Set([...pages.keys(), ...extras]);
  const found = new Set(actual);
  const missing = [...expected].filter((file) => !found.has(file));
  const unexpected = [...found].filter((file) => !expected.has(file));
  assert(!missing.length && !unexpected.length,
    `Route mismatch.\nMissing: ${missing.join(', ') || '(none)'}\nUnexpected: ${unexpected.join(', ') || '(none)'}`);
}

export async function sourceContent(entry, website, api, markdownOptions) {
  assert(entry.filePath?.endsWith('.md'), `Unsupported source type: ${entry.filePath}; Markdown is required.`);
  const file = resolve(website, entry.filePath);
  const repo = resolve(website, '..');
  assert(!relative(repo, file).startsWith(`..${sep}`), `Source escapes repository: ${file}`);
  const parsed = api.parseFrontmatter(await readFile(file, 'utf8'));
  assert.equal(parsed.frontmatter.title, entry.data.title, `Source title changed since capture: ${file}`);
  assert.equal(lines(parsed.content).trim(), lines(entry.body).trim(), `Source body changed since capture: ${file}`);
  const processor = await api.createMarkdownProcessor({ ...markdownOptions, syntaxHighlight: false });
  // Omit fileURL so the public renderer retains <img alt>, rather than build-time asset placeholders.
  const rendered = await processor.render(parsed.content, { frontmatter: parsed.frontmatter });
  const tree = api.fromHtml(rendered.code, { fragment: true });
  return {
    title: entry.data.title, headings: headings(tree), code: codeBlocks(tree),
    prose: words(prose(tree, true)),
  };
}

export function comparePage(html, expected, source, api, label) {
  const tree = api.fromHtml(html);
  const one = (tag) => {
    const nodes = elements(tree, (node) => node.tagName === tag);
    assert.equal(nodes.length, 1, `${label}: expected exactly one ${tag}`);
    return nodes[0];
  };
  assert.equal(one('html').properties.lang, expected.lang, `${label}: document language`);
  const title = words(text(one('title')));
  assert(title === source.title || title.startsWith(`${source.title} | `), `${label}: document title: ${title}`);
  assert.equal(words(text(one('h1'))), words(source.title), `${label}: H1`);
  const content = elements(tree, (node) => hasClass(node, 'sl-markdown-content'));
  assert.equal(content.length, 1, `${label}: expected one Starlight content container`);
  assert.deepEqual(headings(content[0]), source.headings, `${label}: content headings`);
  assert.deepEqual(codeBlocks(content[0]), source.code, `${label}: fenced/code block text`);
  function checkMarkers(node, inCode = false) {
    const code = inCode || node.tagName === 'code' || node.tagName === 'pre';
    if (!code && node.type === 'text') {
      assert(!/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/.test(node.value),
        `${label}: unrendered GitHub admonition marker`);
    }
    for (const child of node.children ?? []) checkMarkers(child, code);
  }
  checkMarkers(content[0]);
  assert.equal(words(prose(content[0])), source.prose, `${label}: source prose (translation or fallback)`);
}

export async function verifyOutput({ entries, config, routes, website, output, markdownOptions }) {
  const api = await parsers(website);
  const pages = expectedPages(entries, config.i18n);
  compareRoutes(await htmlFiles(output), pages, extraPages(routes));
  const sources = new Map();
  for (const [file, expected] of pages) {
    const { entry } = expected;
    if (!sources.has(entry.id)) sources.set(entry.id, await sourceContent(entry, website, api, markdownOptions));
    comparePage(await readFile(join(output, file), 'utf8'), expected, sources.get(entry.id), api, file);
  }
  console.log(`Verified ${pages.size} source-derived pages, including localized content and fallbacks.`);
}
