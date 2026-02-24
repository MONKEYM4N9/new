import crypto from 'crypto';
import path from 'path';
import { splitVideoIntoChunks } from './chunker.js';
import { buildChunkNotes, consolidateNotes } from './ai.js';
import { ensureDir, writeJson } from '../utils/fs.js';

const jobs = new Map();

export function createJob({ originalName, uploadPath }) {
  const id = crypto.randomUUID();
  const job = {
    id,
    originalName,
    uploadPath,
    status: 'queued',
    progress: 0,
    chunkCount: 0,
    usedFallbackChunking: false,
    chunkNotes: [],
    finalNotes: '',
    error: null,
    createdAt: new Date().toISOString()
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export async function processJob(job, config) {
  job.status = 'chunking';

  try {
    const chunkOutputDir = path.join(config.chunkDir, job.id);
    await ensureDir(chunkOutputDir);
    const { chunks, usedFallback } = await splitVideoIntoChunks(
      job.uploadPath,
      chunkOutputDir,
      config.chunkSeconds
    );

    job.usedFallbackChunking = usedFallback;
    job.chunkCount = chunks.length;
    job.status = 'analyzing';

    for (let i = 0; i < chunks.length; i += 1) {
      const note = await buildChunkNotes({
        filePath: chunks[i],
        index: i,
        total: chunks.length,
        config
      });
      job.chunkNotes.push(note);
      job.progress = Math.round(((i + 1) / chunks.length) * 90);
    }

    job.status = 'consolidating';
    job.finalNotes = await consolidateNotes({ notes: job.chunkNotes, config });
    job.progress = 100;
    job.status = 'completed';

    await writeJson(path.join(config.notesDir, `${job.id}.json`), job);
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
  }
}
