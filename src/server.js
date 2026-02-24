import http from 'http';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { stat, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { URL } from 'url';
import { config } from './config.js';
import { ensureDir } from './utils/fs.js';
import { createJob, getJob, processJob } from './services/jobs.js';

const mimeByExt = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8']
]);

async function bootstrap() {
  await Promise.all([
    ensureDir(config.uploadDir),
    ensureDir(config.chunkDir),
    ensureDir(config.notesDir)
  ]);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function serveStatic(res, filePath) {
  try {
    await stat(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': mimeByExt.get(ext) || 'application/octet-stream' });
    await pipeline(createReadStream(filePath), res);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

async function handleUpload(req, res, url) {
  const rawName = (url.searchParams.get('filename') || 'lecture.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = `${Date.now()}-${rawName}`;
  const savedPath = path.join(config.uploadDir, safeName);
  const writeStream = createWriteStream(savedPath);

  let bytes = 0;
  let aborted = false;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > config.maxUploadBytes && !aborted) {
      aborted = true;
      req.destroy(new Error('File exceeds 2GB upload limit.'));
      writeStream.destroy();
      void unlink(savedPath).catch(() => {});
    }
  });

  try {
    await pipeline(req, writeStream);

    const job = createJob({ originalName: rawName, uploadPath: savedPath });
    void processJob(job, config);

    sendJson(res, 202, {
      jobId: job.id,
      status: job.status,
      maxUploadGb: 2,
      message: 'Upload accepted. Lecture is being chunked and analyzed.'
    });
  } catch (error) {
    if (aborted) {
      sendJson(res, 413, { error: 'File exceeds 2GB upload limit.' });
      return;
    }
    sendJson(res, 500, { error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    return serveStatic(res, path.resolve('public/index.html'));
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/jobs/')) {
    const id = url.pathname.replace('/api/jobs/', '');
    const job = getJob(id);
    if (!job) {
      return sendJson(res, 404, { error: 'Job not found' });
    }
    return sendJson(res, 200, job);
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    return handleUpload(req, res, url);
  }

  if (req.method === 'GET' && ['/app.js', '/styles.css'].includes(url.pathname)) {
    return serveStatic(res, path.resolve(`public${url.pathname}`));
  }

  res.writeHead(404);
  res.end('Not found');
});

bootstrap().then(() => {
  server.listen(config.port, () => {
    console.log(`Lecture Notes AI running on http://localhost:${config.port}`);
  });
});
