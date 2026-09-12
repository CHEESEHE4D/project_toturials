import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const expectedSha256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(projectRoot, 'public', 'models', 'hand_landmarker.task');

const response = await fetch(modelUrl);
if (!response.ok) throw new Error(`Model download failed: ${response.status} ${response.statusText}`);
const model = new Uint8Array(await response.arrayBuffer());
const digest = createHash('sha256').update(model).digest('hex');
if (digest !== expectedSha256) throw new Error(`Model checksum mismatch: expected ${expectedSha256}, received ${digest}`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, model);
console.log(`Saved MediaPipe Hand Landmarker (${model.byteLength} bytes, sha256 ${digest}) to ${output}`);
