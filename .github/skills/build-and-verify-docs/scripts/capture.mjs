import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only the verifier sets this variable, pointing at its private temporary directory.
async function record(name, value, root) {
  const directory = process.env.DOCS_VERIFY_CAPTURE;
  if (!directory) return;
  const owner = await readFile(join(directory, 'owner'), 'utf8');
  if (owner !== fileURLToPath(root)) throw new Error('Verification capture belongs to a different site root.');
  await writeFile(join(directory, name), JSON.stringify(value));
}

/** @returns {import('astro').AstroIntegration} */
export function verificationIntegration() {
  return {
    name: 'workshop-verification',
    hooks: process.env.DOCS_VERIFY_CAPTURE ? {
      'astro:config:setup': ({ config, updateConfig }) => {
        // Never write caches into node_modules, which may be shared read-only.
        updateConfig({
          cacheDir: new URL('./.astro/verification-cache/', config.root),
          vite: { cacheDir: fileURLToPath(new URL('./.astro/verification-vite/', config.root)) },
        });
      },
      'astro:config:done': async ({ config }) => {
        if (config.markdown.processor.name !== 'unified') {
          throw new Error(`Unsupported Markdown processor: ${config.markdown.processor.name}`);
        }
        await record('config.json', {
          root: config.root.href,
          outDir: config.outDir.href,
          base: config.base,
          format: config.build.format,
          output: config.output,
          i18n: config.i18n,
          markdown: {
            gfm: config.markdown.processor.options?.gfm ?? config.markdown.gfm,
            smartypants: config.markdown.processor.options?.smartypants ?? config.markdown.smartypants,
          },
        }, config.root);
      },
      'astro:routes:resolved': async ({ routes }) => {
        const directory = process.env.DOCS_VERIFY_CAPTURE;
        const root = new URL(JSON.parse(await readFile(join(directory, 'config.json'), 'utf8')).root);
        await record('routes.json', routes.map((route) => ({
          pathname: route.pathname,
          pattern: route.pattern,
          entrypoint: route.entrypoint,
          params: route.params,
          type: route.type,
          isPrerendered: route.isPrerendered,
        })), root);
      },
    } : {},
  };
}

/**
 * Capture the real loader's parsed entries, not a second implementation of its globs or slugging.
 * @param {import('astro/loaders').Loader} loader
 * @returns {import('astro/loaders').Loader}
 */
export function captureLoader(loader) {
  if (!process.env.DOCS_VERIFY_CAPTURE) return loader;
  return {
    ...loader,
    async load(context) {
      const errors = [];
      const logger = Object.create(context.logger);
      logger.error = (message) => {
        errors.push(message);
        context.logger.error(message);
      };
      await loader.load({
        ...context,
        logger,
      });
      if (errors.length) throw new Error(`Content loader failed: ${errors.join('; ')}`);
      await record('sources.json', [...context.store.values()].map(({ id, data, body, filePath }) => ({
        id, data, body, filePath,
      })), context.config.root);
    },
  };
}
