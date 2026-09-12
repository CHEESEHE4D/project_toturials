import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

if (!ffmpegPath) throw new Error('ffmpeg-static does not provide a binary for this platform.');

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const id of ['pet', 'garden', 'space']) {
  const directory = path.join(projectRoot, 'public', 'themes', id);
  const input = path.join(directory, 'poster.jpg');
  const output = path.join(directory, 'background.jpg');
  const args = ['-y', '-i', input, '-vf', 'scale=540:960:force_original_aspect_ratio=increase,crop=540:960', '-q:v', '3', output];
  console.log(`Generating ${path.relative(projectRoot, output)}...`);
  const result = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`FFmpeg failed for ${id} with exit code ${result.status}.`);
}
