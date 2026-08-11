#!/usr/bin/env node
/**
 * generate-readme.mjs
 * ----------------------------------------------------------------------------
 * Regenerates README.md from a single shared data source: resume.json,
 * published from the lukestrazz.github.io repo (public/resume.json), served
 * for free off GitHub Pages. The portfolio site fetches the same file, so
 * editing resume.json once keeps this profile README and the website in sync.
 *
 * Usage:
 *   node scripts/generate-readme.mjs                       # fetch the live URL
 *   node scripts/generate-readme.mjs ./local-resume.json    # use a local file
 *   node scripts/generate-readme.mjs https://example/x.json # fetch a custom URL
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_SOURCE = 'https://lukestrazz.github.io/resume.json';
const GOLD = { logo: 'F7D98C', bg: '0a0a0d' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const README_PATH = path.join(__dirname, '..', 'README.md');

async function loadResume(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source, { headers: { 'user-agent': 'readme-generator' } });
    if (!res.ok) throw new Error(`Failed to fetch ${source}: ${res.status} ${res.statusText}`);
    return res.json();
  }
  const raw = await readFile(path.resolve(source), 'utf8');
  return JSON.parse(raw);
}

function badge(label, logo) {
  const text = encodeURIComponent(label.replace(/-/g, '--'));
  return `![${label}](https://img.shields.io/badge/${text}-${GOLD.bg}?style=for-the-badge&logo=${logo}&logoColor=${GOLD.logo})`;
}

function badgeRow(items) {
  return items.map((item) => badge(item.name, item.logo)).join('\n');
}

function chipRow(items) {
  return items.map((item) => `\`${item}\``).join(' ');
}

function renderExperience(entries) {
  return entries
    .map((entry, index) => {
      const points = entry.points.map((point) => `- ${point}`).join('\n');
      const header = `**${entry.role}** · ${entry.company}\n<sub>${entry.dates}</sub>`;
      // Keep the current role expanded, collapse the rest to keep the README scannable.
      if (index === 0) {
        return `${header}\n\n${points}`;
      }
      return `<details>\n<summary>${entry.role} · ${entry.company} — <sub>${entry.dates}</sub></summary>\n\n${points}\n\n</details>`;
    })
    .join('\n\n');
}

function renderProjects(projects) {
  return projects
    .map((project) => {
      const link = project.repo ? ` · [repo](${project.repo})` : '';
      return `**${project.title}** <sub>— ${project.label}${link}</sub>\n${project.text}`;
    })
    .join('\n\n');
}

function renderTechBadges(techBadges) {
  return Object.entries(techBadges)
    .map(([category, items]) => `**${category}**\n\n${badgeRow(items)}`)
    .join('\n\n');
}

function render(resume) {
  const { meta } = resume;
  const generatedAt = new Date().toISOString().slice(0, 10);

  return `<!--
  AUTO-GENERATED FILE — do not hand-edit.
  Source of truth: https://lukestrazz.github.io/resume.json (public/resume.json in the
  lukestrazz.github.io repo). Update that file — this README regenerates itself via
  .github/workflows/update-readme.yml (scripts/generate-readme.mjs).
  Last generated: ${generatedAt}
-->

<div align="center">

<img src="./assets/banner.svg" width="100%" alt="${meta.name} — ${meta.title}" />

![Visitors](https://komarev.com/ghpvc/?username=${meta.viewCounterId}&color=8a6420&style=for-the-badge&label=PROFILE+VIEWS)
[![Email](https://img.shields.io/badge/Email-${GOLD.bg}?style=for-the-badge&logo=gmail&logoColor=${GOLD.logo})](mailto:${meta.email})
[![LinkedIn](https://img.shields.io/badge/LinkedIn-${GOLD.bg}?style=for-the-badge&logo=linkedin&logoColor=${GOLD.logo})](${meta.linkedin})
[![Website](https://img.shields.io/badge/Portfolio-${GOLD.bg}?style=for-the-badge&logo=firefox&logoColor=${GOLD.logo})](${meta.website})

</div>

### ${meta.summary}

**${meta.role}** at **${meta.company}**

${resume.quickFacts.map((fact) => `- **${fact.label}:** ${fact.value}`).join('\n')}

<br/>

## Tech I work with

${renderTechBadges(resume.techBadges)}

<br/>

## Experience

${renderExperience(resume.experience)}

<br/>

## Selected work

${renderProjects(resume.projects)}

<br/>

## Education

${resume.education
  .map((edu) => `**${edu.degree}** — ${edu.school} <sub>(${edu.dates})</sub>\n${edu.details.map((d) => `\`${d}\``).join(' ')}`)
  .join('\n\n')}

<br/>

## How I work

${chipRow(resume.workingStyle)}

<br/>

<div align="center">
<sub>Built from one shared data source — <a href="https://lukestrazz.github.io/resume.json">resume.json</a> — that also powers <a href="${meta.website}">${meta.website.replace('https://', '')}</a>.</sub>
</div>
`;
}

async function main() {
  const source = process.argv[2] ?? DEFAULT_SOURCE;
  const resume = await loadResume(source);
  const markdown = render(resume);
  await writeFile(README_PATH, markdown, 'utf8');
  console.log(`README.md regenerated from ${source}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
