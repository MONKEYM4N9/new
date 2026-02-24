const form = document.getElementById('upload-form');
const statusEl = document.getElementById('status');
const notesEl = document.getElementById('notes');
const fileInput = document.getElementById('video');

let pollTimer;

function setStatus(value) {
  statusEl.textContent = JSON.stringify(value, null, 2);
}

async function pollJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}`);
  const job = await response.json();

  setStatus({
    id: job.id,
    status: job.status,
    progress: `${job.progress}%`,
    chunks: job.chunkCount,
    chunkingFallback: job.usedFallbackChunking,
    error: job.error
  });

  if (job.status === 'completed') {
    notesEl.textContent = job.finalNotes;
    clearInterval(pollTimer);
  }

  if (job.status === 'failed') {
    notesEl.textContent = `Job failed: ${job.error}`;
    clearInterval(pollTimer);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  notesEl.textContent = '';

  const file = fileInput.files?.[0];
  if (!file) {
    setStatus({ error: 'Select a video first.' });
    return;
  }

  setStatus({ status: 'uploading' });

  const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file
  });

  const data = await response.json();
  if (!response.ok) {
    setStatus(data);
    return;
  }

  setStatus(data);
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void pollJob(data.jobId);
  }, 2000);
});
