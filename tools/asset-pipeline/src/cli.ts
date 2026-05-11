#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { buildAssetManifest } from './pack/manifest';
import { processAssets } from './process';
import { validatePaletteFile } from './validate/palette-check';
import { createAssetProvider } from './generate/client';

const toolRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const program = new Command()
  .name('mom-assets')
  .description('Master of Music asset pipeline scaffold')
  .version('0.0.0');

program
  .command('gen')
  .description('generate asset drafts from configured providers')
  .action(async () => {
    const provider = createAssetProvider('procedural');
    await provider.generate({ width: 1, height: 1 });
    console.log('ok');
  });

program
  .command('process')
  .description('process generated assets into game-ready sprites')
  .action(async () => {
    await processAssets();
    console.log('ok');
  });

program
  .command('pack')
  .description('pack processed frames into atlases')
  .action(() => {
    console.log('ok');
  });

program
  .command('validate')
  .description('validate asset pipeline inputs and outputs')
  .argument('<file>', 'file to validate')
  .action(async (file: string) => {
    await validatePaletteFile(resolveInputPath(file));
    console.log('ok');
  });

program
  .command('manifest')
  .description('build the asset manifest')
  .action(() => {
    buildAssetManifest([]);
    console.log('ok');
  });

await program.parseAsync();

function resolveInputPath(file: string): string {
  const cwdPath = resolve(process.cwd(), file);
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return resolve(toolRoot, file);
}
