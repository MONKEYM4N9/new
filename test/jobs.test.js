import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob, getJob } from '../src/services/jobs.js';

test('createJob stores job and defaults', () => {
  const job = createJob({ originalName: 'lecture.mp4', uploadPath: '/tmp/lecture.mp4' });
  const fetched = getJob(job.id);

  assert.equal(fetched.id, job.id);
  assert.equal(fetched.status, 'queued');
  assert.equal(fetched.progress, 0);
  assert.equal(fetched.originalName, 'lecture.mp4');
});
