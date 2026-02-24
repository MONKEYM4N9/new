import { readFile } from 'fs/promises';

function chunkPrompt(index, total) {
  return `You are taking notes on chunk ${index + 1} of ${total} from a lecture video. Focus on key topics, formulas, examples, and visual elements (slides/diagrams). Return concise markdown bullet points.`;
}

async function callOpenAI({ apiKey, model, content }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, input: [{ role: 'user', content }] })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${detail}`);
  }

  const json = await response.json();
  return json.output_text?.trim() || '- No notes returned.';
}

export async function buildChunkNotes({ filePath, index, total, config }) {
  if (!config.openAiApiKey) {
    return [
      `### Chunk ${index + 1}`,
      '- Demo mode (no OPENAI_API_KEY set).',
      '- This is where AI notes generated from video + visuals will appear.',
      '- Configure OPENAI_API_KEY to enable real multimodal analysis.'
    ].join('\n');
  }

  const buffer = await readFile(filePath);
  const encoded = buffer.toString('base64');
  return callOpenAI({
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
    content: [
      { type: 'input_text', text: chunkPrompt(index, total) },
      { type: 'input_file', filename: 'chunk.mp4', file_data: `data:video/mp4;base64,${encoded}` }
    ]
  });
}

export async function consolidateNotes({ notes, config }) {
  const joined = notes
    .map((note, i) => `## Segment ${i + 1}\n${note}`)
    .join('\n\n');

  if (!config.openAiApiKey) {
    return `# Final Lecture Notes\n\n${joined}\n\n## Consolidated Summary\n- Demo mode summary.\n- Enable OPENAI_API_KEY for true master-AI consolidation.`;
  }

  return callOpenAI({
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
    content: [
      {
        type: 'input_text',
        text:
          'You are the master AI. Merge all segment notes into cohesive final lecture notes with headings: Overview, Key Concepts, Visual Highlights, Important Examples, Action Items. Here are the segment notes:\n\n' +
          joined
      }
    ]
  });
}
