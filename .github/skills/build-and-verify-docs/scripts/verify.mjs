#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { realpathSync } from 'node:fs';
import { mkdtemp, readFile, writeFile, rm, lstat, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyOutput, htmlFiles, parsers } from './content.mjs';

export const repository = fileURLToPath(new URL('../../../../', import.meta.url));

export function run(command, args, options) {
  const child = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (child.error) throw new Error(`Cannot run ${command}: ${child.error.message}`, { cause: child.error });
  if (child.status !== 0) {
    const error = new Error(`${command} failed${child.signal ? ` (${child.signal})` : ` with exit ${child.status}`}.`);
    error.exitCode = child.status ?? 128 + constants.signals[child.signal];
    throw error;
  }
}

export async function temporary(prefix, action, parent = tmpdir()) {
  const directory = await mkdtemp(join(parent, prefix));
  try {
    return await action(directory);
  } finally {
    // This directory was created by this invocation, never supplied by configuration or a caller.
    await rm(directory, { recursive: true });
  }
}

export async function validateRoot(root) {
  const website = join(root, 'website');
  const stat = await lstat(website);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Site root must be a real directory, not a symlink.');
  const pkg = JSON.parse(await readFile(join(website, 'package.json'), 'utf8'));
  assert(pkg.name === 'copilot-workshops-docs', `Not the workshop site root: ${root}`);
  for (const script of ['check:all', 'build', 'astro']) assert(pkg.scripts?.[script], `Missing package script: ${script}`);
  for (const path of ['astro.config.mjs', 'src/content.config.ts']) {
    assert((await lstat(join(website, path))).isFile(), `Missing site configuration: ${path}`);
  }
  return website;
}

export async function safeOutput(website, config, mustExist = false) {
  assert.equal(config.output, 'static', 'Only static site output is supported.');
  assert.equal(config.format, 'directory', 'Only directory-format pages are supported.');
  assert.equal(fileURLToPath(config.root), `${website}/`, 'Resolved site root does not match the verifier.');
  const output = fileURLToPath(config.outDir).replace(/\/$/, '');
  // Do not turn a configuration typo into deletion of source or arbitrary directories.
  assert.equal(output, join(website, 'dist'), 'Refusing to clean an outDir other than website/dist.');
  try {
    const stat = await lstat(output);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Build output must be a real directory, not a symlink.');
  } catch (error) {
    if (error.code !== 'ENOENT' || mustExist) throw error;
  }
  return output;
}

export function baseSegments(base) {
  assert(typeof base === 'string' && base.startsWith('/'), 'Site base must be an absolute URL path.');
  const segments = base.split('/').filter(Boolean);
  assert(!segments.some((part) => part === '.' || part === '..' || /[%\\?#]/.test(part)),
    `Unsafe or unsupported site base: ${base}`);
  return segments;
}

export async function checkLinks(output, base) {
  const segments = baseSegments(base);
  const files = await htmlFiles(output);
  assert(files.length, 'No built HTML found for link validation.');
  await temporary('workshop-links-', async (directory) => {
    const root = segments.length ? join(directory, 'root') : output;
    if (segments.length) {
      const target = join(root, ...segments);
      await mkdir(dirname(target), { recursive: true });
      await symlink(output, target, 'dir');
    }
    // Lychee expands this pattern itself; spawning without a shell preserves paths with spaces.
    run('lychee', ['--offline', '--no-progress', '--root-dir', root, join(output, '**/*.html')]);
  });
}

export async function main(args = process.argv.slice(2)) {
  assert(args.length <= 1 && ['all', 'build', 'links'].includes(args[0] ?? 'all'),
    'Usage: node verify.mjs [all|build|links]');
  assert(process.platform !== 'win32', 'This workflow is tested on POSIX systems; native Windows is not supported.');
  const mode = args[0] ?? 'all';
  const website = await validateRoot(repository);
  await parsers(website); // Fail before any cleanup if the declared dependencies are unavailable.
  await temporary('workshop-verify-', async (directory) => {
    await writeFile(join(directory, 'owner'), `${website}/`);
    const env = { ...process.env, DOCS_VERIFY_CAPTURE: directory };
    const options = { cwd: website, env };
    run('npm', mode === 'links' ? ['run', 'astro', '--', 'sync'] : ['run', 'check:all'], options);
    const captured = async (name) => JSON.parse(await readFile(join(directory, name), 'utf8'));
    const config = await captured('config.json');
    const output = await safeOutput(website, config, mode === 'links');
    if (mode === 'links') {
      await checkLinks(output, config.base);
      return;
    }
    await rm(output, { recursive: true, force: true });
    run('npm', ['run', 'build'], options);
    const builtConfig = await captured('config.json');
    assert.equal(await safeOutput(website, builtConfig, true), output);
    await verifyOutput({
      entries: await captured('sources.json'),
      config: builtConfig,
      routes: await captured('routes.json'),
      website, output,
      markdownOptions: builtConfig.markdown,
    });
    if (mode === 'all') await checkLinks(output, builtConfig.base);
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = error.exitCode ?? 1;
  });
}
