import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDashboard,
  calculateOverallProgress,
  renderTemplate,
  validateStatus,
} from '../scripts/build.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function validStatus() {
  return {
    meta: {
      title: '本地端 LLM Agent 工具安全研究',
      updatedAt: '2026-08-17',
      currentStage: '防禦架構與實驗準備',
      nextGate: '建立最小 tool-calling harness 並完成 Pilot',
      progressLabel: '人工維護的加權規劃進度',
    },
    metrics: {
      chaptersDrafted: 4,
      chaptersTotal: 8,
      literatureCount: 31,
      pilotCompleted: 0,
      pilotTarget: 50,
      blockers: 4,
    },
    milestones: [
      { id: 'design', label: '研究設計', weight: 20, completion: 90 },
      { id: 'literature', label: '文獻回顧', weight: 15, completion: 100 },
      { id: 'implementation', label: '實驗環境與程式', weight: 20, completion: 20 },
      { id: 'experiment', label: 'Pilot 與正式實驗', weight: 25, completion: 0 },
      { id: 'writing', label: '論文撰寫', weight: 15, completion: 50 },
      { id: 'submission', label: '口試與提交', weight: 5, completion: 0 },
    ],
    chapters: [{ number: 1, title: '緒論', status: 'drafted', note: '初稿完成' }],
    priorities: [{ title: '第 5 章', detail: '撰寫 L1、L3 與模擬工具設計', owner: '可在寫作機進行' }],
    blockers: [{ title: 'Pilot', detail: '需在實驗主機執行', kind: 'experiment-host' }],
    architecture: {
      attacks: ['工具 metadata／manifest 污染', '工具輸出間接提示注入'],
      defenses: [
        { id: 'L1', title: '來源完整性', detail: '驗證 manifest 與來源' },
        { id: 'L2', title: '意圖—能力比對', detail: '規則與 embedding' },
        { id: 'L3', title: '政策閘門', detail: '獨立 deterministic 規則' },
      ],
      outcome: '模擬執行器',
    },
    decisions: [{ date: '2026-08-16', title: '實驗架構定案', detail: '六個無外部能力的模擬工具' }],
    sources: ['WORK_SPLIT.md', 'PROJECT_MEMORY.md', 'THESIS_OUTLINE.md', 'EXPERIMENT_ARCHITECTURE.md'],
  };
}

test('calculates weighted planning progress from milestone weights', () => {
  assert.equal(calculateOverallProgress(validStatus().milestones), 45);
});

test('accepts a complete public status snapshot', () => {
  assert.doesNotThrow(() => validateStatus(validStatus()));
});

test('rejects milestone weights that do not total 100', () => {
  const status = validStatus();
  status.milestones[0].weight = 19;
  assert.throws(() => validateStatus(status), /權重合計必須為 100/);
});

test('rejects completion values outside 0 to 100', () => {
  const status = validStatus();
  status.milestones[2].completion = 101;
  assert.throws(() => validateStatus(status), /完成率必須介於 0 與 100/);
});

test('rejects private paths and private-service links', () => {
  for (const unsafe of [
    'C:\\Users\\Username\\Documents\\ChatGPT',
    'https://app.notion.com/private-page',
    'https://github.com/example/private-repository',
  ]) {
    const status = validStatus();
    status.priorities[0].detail = unsafe;
    assert.throws(() => validateStatus(status), /不適合公開的內容/);
  }
});

test('renders an inline snapshot without leaving the template marker', () => {
  const output = renderTemplate(
    '<script>window.__THESIS_STATUS__ = __STATUS_JSON__;</script>',
    validStatus(),
  );
  assert.doesNotMatch(output, /__STATUS_JSON__/);
  assert.match(output, /"currentStage":"防禦架構與實驗準備"/);
});

test('escapes closing script tags in embedded data', () => {
  const status = validStatus();
  status.priorities[0].detail = '<\/script><script>alert(1)<\/script>';
  const output = renderTemplate('__STATUS_JSON__', status);
  assert.doesNotMatch(output, /<\/script>/i);
});

test('template contains the required dashboard regions and display modes', async () => {
  const template = await readFile(path.join(repositoryRoot, 'src', 'template.html'), 'utf8');
  for (const id of ['overview', 'milestones', 'chapters', 'actions', 'architecture', 'timeline']) {
    assert.match(template, new RegExp(`id="${id}"`));
  }
  assert.match(template, /data-mode="personal"/);
  assert.match(template, /data-mode="professor"/);
  assert.match(template, /<main\b/);
  assert.match(template, /aria-label=/);
});

test('builds one standalone HTML snapshot with no external network dependency', async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'thesis-dashboard-'));
  const outputPath = path.join(temporaryDirectory, 'index.html');

  try {
    const result = await buildDashboard({ outputPath });
    const output = await readFile(outputPath, 'utf8');

    assert.equal(result.overallProgress, 45);
    assert.match(output, /^<!doctype html>/i);
    assert.doesNotMatch(output, /__STATUS_JSON__/);
    assert.doesNotMatch(output, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
    assert.match(output, /window\.__THESIS_STATUS__/);
    assert.match(output, /本地端 LLM Agent 工具安全研究/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('GitHub Pages workflow tests, builds, and deploys the generated site', async () => {
  const workflow = await readFile(path.join(repositoryRoot, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /node --test/);
  assert.match(workflow, /node scripts\/build\.mjs/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test('maintenance guide documents the semi-automatic update and public-safety flow', async () => {
  const readme = await readFile(path.join(repositoryRoot, 'README.md'), 'utf8');
  assert.match(readme, /data\/status\.json/);
  assert.match(readme, /node --test/);
  assert.match(readme, /node scripts\/build\.mjs/);
  assert.match(readme, /不得公開/);

  const gitignore = await readFile(path.join(repositoryRoot, '.gitignore'), 'utf8');
  assert.match(gitignore, /^dist\/$/m);
});
