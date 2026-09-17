/**
 * Refreshes — or audits — the vendored copy of @platform/client-core.
 *
 * ── Why the package is vendored ─────────────────────────────────────────────
 * The package used to be consumed as `file:../platform-client-core`, which npm
 * installs as a symlink to a sibling repository that exists only on a
 * developer's machine. Vercel builds from a clean clone and never sees that
 * sibling, so every deployment failed with "Can't resolve
 * '@platform/client-core'" on each file that imports it.
 *
 * The fix is the one client-platform-app already uses: vendor a built copy INTO
 * this repo (./vendor/client-core) and depend on that path instead, so the
 * package travels with whatever is committed. The cost is that the copy can
 * drift from the source repo, so this script is both how you pull a fresh one
 * in and how you prove one has not drifted.
 *
 *   node scripts/sync-client-core.js            refresh the vendored copy
 *   node scripts/sync-client-core.js --check    fail if it has drifted
 *
 * `--check` is a developer-machine check. Where the source repo is absent — a
 * clean clone, CI, Vercel — there is nothing to compare against and it passes,
 * because the vendored copy IS the source of truth there.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- a Node CommonJS build script, not app source */
const { execSync } = require('child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} = require('fs');
const { join, relative, sep } = require('path');

const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, '..', 'platform-client-core');
const VENDORED = join(ROOT, 'vendor', 'client-core');
const COPIED = ['dist', 'src'];

/** Every file under `dir`, as paths relative to it, sorted. */
function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

/**
 * Only the fields the client needs to resolve and type the package. Not
 * `scripts`/`devDependencies`: this copy is never built again in place, only
 * read by node_modules resolution.
 */
function vendoredManifest(sourcePkg) {
  return {
    name: sourcePkg.name,
    version: sourcePkg.version,
    private: true,
    description: sourcePkg.description,
    main: sourcePkg.main,
    types: sourcePkg.types,
  };
}

/**
 * Content compared as text, with line endings normalised.
 *
 * Both trees are git checkouts. On Windows, core.autocrlf rewrites them to
 * CRLF on checkout, and the two repos are not guaranteed to have been checked
 * out under the same setting — so a byte comparison reports every line of
 * every file as drift the first time someone clones fresh. The question this
 * asks is whether the CODE differs, and a line ending is not code.
 */
function text(content) {
  return content.split('\r\n').join('\n');
}

function check() {
  if (!existsSync(SOURCE)) {
    console.log(`platform-client-core not present at ${SOURCE} — nothing to compare against.`);
    console.log('The vendored copy is the source of truth here. OK.');
    return;
  }

  const problems = [];

  for (const dir of COPIED) {
    const from = walk(join(SOURCE, dir));
    const to = existsSync(join(VENDORED, dir)) ? walk(join(VENDORED, dir)) : [];

    for (const file of from) {
      if (!to.includes(file)) {
        problems.push(`missing from vendored copy: ${dir}/${file}`);
        continue;
      }
      const a = text(readFileSync(join(SOURCE, dir, file), 'utf8'));
      const b = text(readFileSync(join(VENDORED, dir, file), 'utf8'));
      if (a !== b) problems.push(`differs from source: ${dir}/${file}`);
    }
    for (const file of to) {
      if (!from.includes(file)) problems.push(`not in source any more: ${dir}/${file}`);
    }
  }

  const sourcePkg = JSON.parse(readFileSync(join(SOURCE, 'package.json'), 'utf8'));
  const expected = JSON.stringify(vendoredManifest(sourcePkg), null, 2) + '\n';
  if (readFileSync(join(VENDORED, 'package.json'), 'utf8') !== expected) {
    problems.push('package.json differs from source');
  }

  if (problems.length) {
    console.error('\nThe vendored @platform/client-core has drifted from platform-client-core:\n');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('\nRun `npm run sync:client-core` to refresh it.\n');
    process.exit(1);
  }

  console.log('Vendored @platform/client-core matches platform-client-core exactly.');
}

function sync() {
  if (!existsSync(SOURCE)) {
    console.error(`platform-client-core not found at ${SOURCE} — nothing to sync from.`);
    process.exit(1);
  }

  console.log('Building @platform/client-core...');
  execSync('npm run build', { cwd: SOURCE, stdio: 'inherit' });

  rmSync(VENDORED, { recursive: true, force: true });
  mkdirSync(VENDORED, { recursive: true });
  for (const dir of COPIED) {
    cpSync(join(SOURCE, dir), join(VENDORED, dir), { recursive: true });
  }

  const sourcePkg = JSON.parse(readFileSync(join(SOURCE, 'package.json'), 'utf8'));
  writeFileSync(
    join(VENDORED, 'package.json'),
    JSON.stringify(vendoredManifest(sourcePkg), null, 2) + '\n'
  );

  console.log(`Synced ${SOURCE} -> ${VENDORED}`);
  console.log('Run `npm install` so node_modules/@platform/client-core picks up the refreshed copy.');
}

if (process.argv.includes('--check')) check();
else sync();
