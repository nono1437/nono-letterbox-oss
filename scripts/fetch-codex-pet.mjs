import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourceUrl =
  'https://persistent.oaistatic.com/codex/pets/v1/codex-spritesheet-v4.webp';
const destination = resolve('public/codex-spritesheet-v4.webp');
const expectedWidth = 1536;
const expectedHeight = 1872;
const minimumBytes = 500_000;

async function looksUsable(path) {
  try {
    const info = await stat(path);
    if (info.size < minimumBytes) return false;
    const header = await readFile(path, { encoding: null });
    return (
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  } catch {
    return false;
  }
}

if (await looksUsable(destination)) {
  console.log(`Codex pet asset already present: ${destination}`);
  process.exit(0);
}

await mkdir(dirname(destination), { recursive: true });
const response = await fetch(sourceUrl, {
  headers: { 'user-agent': 'nono-letterbox-oss-build' },
  signal: AbortSignal.timeout(60_000),
});

if (!response.ok) {
  throw new Error(`Unable to download Codex pet asset: HTTP ${response.status}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length < minimumBytes) {
  throw new Error(`Codex pet asset was unexpectedly small: ${bytes.length} bytes`);
}
if (
  bytes.subarray(0, 4).toString('ascii') !== 'RIFF' ||
  bytes.subarray(8, 12).toString('ascii') !== 'WEBP'
) {
  throw new Error('Codex pet asset was not a valid WebP container');
}

await writeFile(destination, bytes);
console.log(
  `Downloaded official Codex pet spritesheet (${expectedWidth}×${expectedHeight}, ${bytes.length} bytes)`,
);
