import { spawn } from 'child_process';
import path from 'path';
import { readdir } from 'fs/promises';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} exited with ${code}: ${stderr}`));
        return;
      }
      resolve(stderr);
    });
  });
}

export async function splitVideoIntoChunks(inputPath, outputDir, chunkSeconds) {
  const stem = path.basename(inputPath, path.extname(inputPath));
  const outputPattern = path.join(outputDir, `${stem}-%03d.mp4`);

  try {
    await run('ffmpeg', [
      '-i',
      inputPath,
      '-c',
      'copy',
      '-map',
      '0',
      '-f',
      'segment',
      '-segment_time',
      String(chunkSeconds),
      '-reset_timestamps',
      '1',
      outputPattern
    ]);

    const files = await readdir(outputDir);
    const chunks = files
      .filter((name) => name.startsWith(stem) && name.endsWith('.mp4'))
      .sort()
      .map((name) => path.join(outputDir, name));

    if (chunks.length === 0) {
      throw new Error('Chunking produced no output segments.');
    }

    return { chunks, usedFallback: false };
  } catch {
    return { chunks: [inputPath], usedFallback: true };
  }
}
