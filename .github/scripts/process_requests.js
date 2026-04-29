'use strict';

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Support both native OpenAI and OpenRouter (OpenAI-compatible)
const clientConfig = {
  apiKey: process.env.OPENAI_API_KEY,
};
if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.trim() !== '') {
  clientConfig.baseURL = process.env.OPENAI_BASE_URL.trim();
  console.log('Using custom API base: ' + clientConfig.baseURL);
}

const openai = new OpenAI(clientConfig);
const isOpenRouter = (clientConfig.baseURL || '').includes('openrouter');
const MODEL = isOpenRouter ? 'openai/gpt-4o' : 'gpt-4o';

function buildPrompt(req) {
  const features = (req.features || []).map((f, i) => (i + 1) + '. ' + f).join('\n');
  return [
    'BUILD MODE: Generate a complete production-ready web application.',
    '',
    'Project Name: ' + req.project_name,
    'Description: ' + req.description,
    'Stack: ' + (req.stack || 'react-trpc-tailwind'),
    'Theme: ' + (req.theme || 'dark'),
    'Market: ' + (req.market || 'canadian'),
    '',
    'Features:',
    features,
    '',
    'REQUIREMENTS:',
    'Write every file with complete runnable code. No placeholders. No TODOs.',
    'Required structure: package.json, tsconfig.json, src/server/index.ts,',
    'src/server/routes.ts, src/client/index.html, src/client/main.tsx,',
    'src/client/App.tsx, src/client/components/, src/shared/types.ts',
    'Dark theme: bg-gray-900 text-white.',
    'All imports correct. All deps in package.json. Include build/dev/start scripts.',
    '',
    'RESPONSE FORMAT:',
    'Return ONLY a valid JSON object where keys are relative file paths',
    'and values are complete file contents as strings.',
    'No markdown, no explanations, no code fences. Pure JSON only.',
  ].join('\n');
}

async function processFile(filePath) {
  console.log('\n========================================');
  console.log('Processing: ' + filePath);
  console.log('========================================');

  let req;
  try {
    req = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('ERROR: Failed to parse JSON: ' + e.message);
    process.exitCode = 1;
    return;
  }

  if (path.basename(filePath) === 'TEMPLATE.json') {
    console.log('Skipping TEMPLATE.json');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const buildDir = path.join('builds', (req.project_name || 'project') + '_' + timestamp);
  console.log('Build dir: ' + buildDir);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'STATUS.md'), 'PENDING\n\nStarted: ' + new Date().toISOString());

  try {
    const prompt = buildPrompt(req);
    console.log('Calling AI API with model: ' + MODEL);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a code generator. Return ONLY a valid JSON object mapping file paths to complete file contents. No markdown, no explanations.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content;
    let files;
    try {
      files = JSON.parse(raw);
    } catch (e) {
      throw new Error('AI returned invalid JSON: ' + e.message + '\nPreview: ' + raw.slice(0, 300));
    }

    const fileList = Object.keys(files);
    console.log('Generated ' + fileList.length + ' files:');
    fileList.forEach(function(f) { console.log('  - ' + f); });

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(buildDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    }

    const status = [
      'READY_FOR_ASSEMBLY',
      '',
      'Project: ' + req.project_name,
      'Generated: ' + new Date().toISOString(),
      'Files: ' + fileList.length,
      '',
      '## File List',
      fileList.map(function(f) { return '- ' + f; }).join('\n'),
    ].join('\n');
    fs.writeFileSync(path.join(buildDir, 'STATUS.md'), status);
    console.log('\nSUCCESS: ' + buildDir);

    const processedDir = path.join('requests', 'processed');
    fs.mkdirSync(processedDir, { recursive: true });
    fs.renameSync(filePath, path.join(processedDir, path.basename(filePath)));
    console.log('Request archived.');

  } catch (err) {
    console.error('\nFAILED: ' + err.message);
    const failure = [
      'FAILED',
      '',
      'Project: ' + req.project_name,
      'Failed: ' + new Date().toISOString(),
      '',
      '## Error',
      '```',
      err.message,
      '```',
    ].join('\n');
    fs.writeFileSync(path.join(buildDir, 'STATUS.md'), failure);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('Dual-Agent Build Pipeline - Code Generation');
  console.log('Timestamp: ' + new Date().toISOString());

  const requestFiles = fs.readdirSync('requests')
    .filter(function(f) { return f.endsWith('.json') && f !== 'TEMPLATE.json'; })
    .map(function(f) { return path.join('requests', f); });

  if (requestFiles.length === 0) {
    console.log('No new request files found.');
    return;
  }

  console.log('Found ' + requestFiles.length + ' request(s).');
  for (const file of requestFiles) {
    await processFile(file);
  }
}

main().catch(function(err) {
  console.error('Fatal: ' + err.message);
  process.exitCode = 1;
});
