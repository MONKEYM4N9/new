import path from 'path';

export const config = {
  port: Number(process.env.PORT || 3000),
  uploadDir: path.resolve('data/uploads'),
  chunkDir: path.resolve('data/chunks'),
  notesDir: path.resolve('data/notes'),
  maxUploadBytes: 2 * 1024 * 1024 * 1024,
  chunkSeconds: Number(process.env.CHUNK_SECONDS || 600),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini'
};
