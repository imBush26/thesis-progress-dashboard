import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredMetaFields = [
  'title',
  'updatedAt',
  'currentStage',
  'nextGate',
  'progressLabel',
];

const sensitivePatterns = [
  { pattern: /[A-Z]:\\+Users\\+/i, label: 'Windows 使用者路徑' },
  { pattern: /(?:app\.)?notion\.com/i, label: 'Notion 連結' },
  { pattern: /github\.com\//i, label: 'repository 連結' },
  { pattern: /(?:api[_-]?key|token|secret|password)\s*[:=]/i, label: '憑證欄位' },
];

function collectText(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectText(item, output);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      output.push(key);
      collectText(item, output);
    }
  }
  return output;
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必須是物件`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} 必須是非空陣列`);
  }
}

export function calculateOverallProgress(milestones) {
  const weighted = milestones.reduce(
    (sum, milestone) => sum + milestone.weight * milestone.completion / 100,
    0,
  );
  return Math.round(weighted);
}

export function validateStatus(status) {
  assertObject(status, 'status');
  assertObject(status.meta, 'meta');
  assertObject(status.metrics, 'metrics');
  assertObject(status.architecture, 'architecture');

  for (const field of requiredMetaFields) {
    if (typeof status.meta[field] !== 'string' || !status.meta[field].trim()) {
      throw new Error(`meta.${field} 是必要文字欄位`);
    }
  }

  for (const field of ['chaptersDrafted', 'chaptersTotal', 'literatureCount', 'pilotCompleted', 'pilotTarget', 'blockers']) {
    if (!Number.isFinite(status.metrics[field]) || status.metrics[field] < 0) {
      throw new Error(`metrics.${field} 必須是非負數字`);
    }
  }

  for (const field of ['milestones', 'chapters', 'priorities', 'blockers', 'decisions', 'sources']) {
    assertArray(status[field], field);
  }
  assertArray(status.architecture.attacks, 'architecture.attacks');
  assertArray(status.architecture.defenses, 'architecture.defenses');

  const weightTotal = status.milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
  if (weightTotal !== 100) {
    throw new Error(`里程碑權重合計必須為 100，目前為 ${weightTotal}`);
  }

  for (const milestone of status.milestones) {
    if (!Number.isFinite(milestone.completion) || milestone.completion < 0 || milestone.completion > 100) {
      throw new Error(`${milestone.label ?? milestone.id} 的完成率必須介於 0 與 100`);
    }
  }

  const serialized = collectText(status).join('\n');
  for (const { pattern, label } of sensitivePatterns) {
    if (pattern.test(serialized)) {
      throw new Error(`發現不適合公開的內容：${label}`);
    }
  }

  return status;
}

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function renderTemplate(template, status) {
  validateStatus(status);
  const snapshot = {
    ...status,
    computed: {
      overallProgress: calculateOverallProgress(status.milestones),
    },
  };
  return template.replace('__STATUS_JSON__', serializeForInlineScript(snapshot));
}

export async function buildDashboard({
  statusPath = path.join(repositoryRoot, 'data', 'status.json'),
  templatePath = path.join(repositoryRoot, 'src', 'template.html'),
  outputPath = path.join(repositoryRoot, 'dist', 'index.html'),
} = {}) {
  const [statusText, template] = await Promise.all([
    readFile(statusPath, 'utf8'),
    readFile(templatePath, 'utf8'),
  ]);
  const status = JSON.parse(statusText);
  const output = renderTemplate(template, status);

  if (output.includes('__STATUS_JSON__')) {
    throw new Error('模板資料標記未完整替換');
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf8');
  return { outputPath, overallProgress: calculateOverallProgress(status.milestones) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildDashboard();
  console.log(`Built ${result.outputPath} (${result.overallProgress}%)`);
}
