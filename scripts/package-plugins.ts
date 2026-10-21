import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Metadata maintained once in the portable Agent Plugins manifest. */
type PluginManifest = {
  $schema: string;
  name: string;
  version: string;
  description: string;
  author: { name: string; url?: string };
  homepage: string;
  repository: string;
  license: string;
  keywords: string[];
  extensions?: Record<string, unknown>;
};

const targets = ['agents', 'claude', 'antigravity'] as const;
const marketplaceName = 'animegarden';

/** Read a package tree without following links outside its installation boundary. */
async function readTree(directory: string, prefix = ''): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name;
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Package files must not be symlinks: ${path}`);
    if (entry.isDirectory()) {
      for (const [name, content] of await readTree(path, relative + '/')) files.set(name, content);
    } else {
      assert(entry.isFile(), `Unsupported package entry: ${path}`);
      files.set(relative, await readFile(path));
    }
  }
  return files;
}

/** Generate platform adapters and catalogs; --check compares bytes without changing files. */
export async function syncPlugins(root: string, check = false): Promise<void> {
  const manifest: PluginManifest = JSON.parse(
    await readFile(join(root, 'plugins/agents/plugin.json'), 'utf8')
  );
  const mcp = JSON.parse(await readFile(join(root, 'plugins/agents/mcp.json'), 'utf8'));
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(manifest.name, 'animegarden');
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert(manifest.description && manifest.author.name && manifest.license);
  assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
  assert.deepEqual(Object.keys(mcp.mcpServers), ['animegarden']);
  const server = mcp.mcpServers.animegarden;
  // These adapters intentionally support only the public remote HTTP service.
  assert.deepEqual(Object.keys(server).sort(), ['type', 'url']);
  assert.equal(server.type, 'streamable-http');
  assert.equal(new URL(server.url).protocol, 'https:');

  const skill = await readTree(join(root, 'skills/animegarden'));
  const readme = await readFile(join(root, 'plugins/agents/README.md'));
  for (const file of ['SKILL.md', 'references/api.md', 'references/pikpak.md', 'LICENSE.txt']) {
    assert(skill.has(file), `Missing skill source: ${file}`);
  }
  const expected = new Map<string, Buffer>();
  // Bundle the site's existing icon so cached plugins do not depend on the web app directory.
  const icon = await readFile(join(root, 'apps/web/public/pwa-512x512.png'));
  expected.set('plugins/agents/assets/icon.png', icon);
  expected.set('plugins/claude/assets/icon.png', icon);
  const json = (path: string, value: unknown) => {
    expected.set(path, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
  };

  for (const target of targets) {
    const base = `plugins/${target}`;
    for (const [name, content] of skill)
      expected.set(`${base}/skills/animegarden/${name}`, content);
    expected.set(`${base}/LICENSE`, skill.get('LICENSE.txt')!);
    // Reuse the portable package's user guide in the Claude distribution.
    if (target === 'claude') expected.set(`${base}/README.md`, readme);
  }
  // Portable identity remains the only editable version source; adapters select supported fields.
  const { $schema, extensions, ...claudeManifest } = manifest;
  json('plugins/claude/.claude-plugin/plugin.json', {
    ...claudeManifest,
    icon: './assets/icon.png'
  });
  json('plugins/claude/.mcp.json', {
    mcpServers: { animegarden: { type: 'http', url: server.url } }
  });
  // Antigravity's manifest supports a smaller field set and uses serverUrl for remote MCP.
  json('plugins/antigravity/plugin.json', {
    name: manifest.name,
    description: manifest.description
  });
  json('plugins/antigravity/mcp_config.json', {
    mcpServers: { animegarden: { serverUrl: server.url } }
  });
  json('.claude-plugin/marketplace.json', {
    name: marketplaceName,
    description: 'Anime Garden skills and remote MCP for Claude Code.',
    owner: manifest.author,
    plugins: [
      { name: manifest.name, source: './plugins/claude', description: manifest.description }
    ]
  });
  json('.agents/plugins/marketplace.json', {
    name: marketplaceName,
    interface: { displayName: 'AnimeGarden' },
    plugins: [
      {
        name: manifest.name,
        source: { source: 'local', path: './plugins/agents' },
        policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
        category: 'Entertainment'
      }
    ]
  });
  json('.cursor-plugin/marketplace.json', {
    name: marketplaceName,
    owner: manifest.author,
    metadata: { description: 'Anime Garden skills and remote MCP for Cursor.' },
    plugins: [{ name: manifest.name, source: 'plugins/agents', description: manifest.description }]
  });

  const obsolete: string[] = [];
  // Prune removed skill references, but never silently delete hand-written package files.
  for (const target of targets) {
    for (const name of (await readTree(join(root, 'plugins', target))).keys()) {
      if (target === 'agents' && ['plugin.json', 'mcp.json', 'README.md'].includes(name)) continue;
      const path = `plugins/${target}/${name}`;
      if (expected.has(path)) continue;
      assert(name.startsWith('skills/'), `Unexpected package file (remove or declare it): ${path}`);
      obsolete.push(path);
    }
  }
  const changed: string[] = [];
  for (const [path, content] of expected) {
    const current = await readFile(join(root, path)).catch((error) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (!current?.equals(content)) changed.push(path);
  }
  if (check) {
    assert(
      changed.length + obsolete.length === 0,
      `Plugins are out of sync. Run pnpm plugins:sync.\n${[...changed, ...obsolete].join('\n')}`
    );
    return;
  }
  for (const path of changed) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), expected.get(path)!);
  }
  for (const path of obsolete) await rm(join(root, path));
}

/** Create self-contained ZIPs with manifests at the archive root; never publish them. */
export async function archivePlugins(root: string): Promise<string[]> {
  await syncPlugins(root, true);
  const { version } = JSON.parse(await readFile(join(root, 'plugins/agents/plugin.json'), 'utf8'));
  const output = join(root, 'dist/plugins');
  await mkdir(output, { recursive: true });
  const paths: string[] = [];
  const checksums: string[] = [];
  for (const target of targets) {
    const filename = `animegarden-${target}-${version}.zip`;
    const path = join(output, filename);
    // Recreate the ZIP so deleted references cannot survive in an older archive.
    await rm(path, { force: true });
    const directory = join(root, 'plugins', target);
    execFileSync('zip', ['-q', '-X', path, ...Array.from((await readTree(directory)).keys())], {
      cwd: directory
    });
    const hash = createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
    checksums.push(`${hash}  ${filename}`);
    paths.push(path);
  }
  await writeFile(join(output, `SHA256SUMS-${version}`), checksums.join('\n') + '\n');
  return paths;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const args = process.argv.slice(2);
  assert(
    args.length <= 1 && args.every((arg) => ['--check', '--archive'].includes(arg)),
    'Use --check or --archive'
  );
  if (args[0] === '--archive') {
    for (const path of await archivePlugins(root)) console.log(path);
  } else {
    await syncPlugins(root, args[0] === '--check');
    console.log(args[0] === '--check' ? 'Plugins are in sync.' : 'Plugins synchronized.');
  }
}
