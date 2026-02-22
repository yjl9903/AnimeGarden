#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import YAML from 'yaml';

function dedupe(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function toStringArray(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return dedupe(value);
  if (typeof value === 'string') return dedupe([value]);
  return [];
}

function pad2(num) {
  return String(num).padStart(2, '0');
}

function parseLegacyDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;

  const match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    const second = Number(match[6] ?? 0);
    const date = new Date(year, month - 1, day, hour, minute, second, 0);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const fallback = new Date(text.replace(' ', 'T'));
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return undefined;
}

function toLocalDateTime(value, fallbackFileBase) {
  const date = parseLegacyDate(value);
  if (date) {
    return [
      date.getFullYear(),
      '-',
      pad2(date.getMonth() + 1),
      '-',
      pad2(date.getDate()),
      ' ',
      pad2(date.getHours()),
      ':',
      pad2(date.getMinutes()),
      ':',
      pad2(date.getSeconds())
    ].join('');
  }

  const match = fallbackFileBase.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}-01 00:00:00`;
  }

  return '1970-01-01 00:00:00';
}

function flattenTranslations(value) {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return dedupe([value]);
  if (Array.isArray(value)) return dedupe(value);
  if (typeof value === 'object') {
    const out = [];
    for (const item of Object.values(value)) {
      if (typeof item === 'string') out.push(item);
      else if (Array.isArray(item)) out.push(...item);
    }
    return dedupe(out);
  }
  return [];
}

function resolveLegacyKeywords(subject) {
  const title = typeof subject.title === 'string' ? subject.title.trim() : '';
  const alias = toStringArray(subject.alias);
  const translations = flattenTranslations(subject.translations);
  const baseTitles = dedupe([title, ...alias, ...translations]);

  const raw = subject.keywords;
  if (raw === undefined || raw === null) {
    return { include: baseTitles, exclude: [] };
  }

  if (typeof raw === 'string') {
    if (raw.startsWith('!')) {
      return { include: baseTitles, exclude: dedupe([raw.slice(1)]) };
    }
    return { include: dedupe([...baseTitles, raw]), exclude: [] };
  }

  if (Array.isArray(raw)) {
    const include = [];
    const exclude = [];
    for (const item of raw) {
      if (typeof item !== 'string') continue;
      if (item.startsWith('!')) exclude.push(item.slice(1));
      else include.push(item);
    }
    return { include: dedupe(include), exclude: dedupe(exclude) };
  }

  if (typeof raw === 'object') {
    const include = toStringArray(raw.include);
    const exclude = toStringArray(raw.exclude);
    return { include, exclude };
  }

  return { include: baseTitles, exclude: [] };
}

function convertTemplate(text) {
  if (typeof text !== 'string') return undefined;
  let template = text.trim();
  if (!template) return undefined;

  template = template
    .replaceAll('{title}', '{name}')
    .replaceAll('{ep}', '{episode}')
    .replaceAll('{yyyy}', '{year}')
    .replaceAll('{YYYY}', '{year}')
    .replaceAll('{MM}', '{month}')
    .replaceAll('{mm}', '{month}')
    .replaceAll('{extension}', '');

  template = template.replace(/\s*\.\s*$/g, '').replace(/\.\./g, '.').trim();
  return template || undefined;
}

function applySpacing(yamlText) {
  const lines = yamlText.trimEnd().split('\n');

  const topSpaced = [];
  let seenTopLevel = false;
  for (const line of lines) {
    const isTopLevelKey = /^[^\s][^:]*:/.test(line);
    if (isTopLevelKey && seenTopLevel && topSpaced[topSpaced.length - 1] !== '') {
      topSpaced.push('');
    }
    topSpaced.push(line);
    if (isTopLevelKey) seenTopLevel = true;
  }

  const finalLines = [];
  let inSubjects = false;
  let seenSubject = false;
  for (const line of topSpaced) {
    if (/^subjects:/.test(line)) {
      inSubjects = true;
      seenSubject = false;
      finalLines.push(line);
      continue;
    }

    if (inSubjects && /^[^\s]/.test(line) && !/^subjects:/.test(line)) {
      inSubjects = false;
      seenSubject = false;
    }

    if (inSubjects && /^  - /.test(line)) {
      if (seenSubject && finalLines[finalLines.length - 1] !== '') {
        finalLines.push('');
      }
      seenSubject = true;
    }

    finalLines.push(line);
  }

  return finalLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function normalizeStoragePath(input) {
  const portable = String(input).replace(/\\/g, '/');
  if (portable.split('/').includes('..')) {
    throw new Error(`storage path cannot contain '..': ${input}`);
  }
  return portable.replace(/^\.\//, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

function validateOutput(files, outputDir) {
  const names = new Map();
  const byDriver = new Map();

  for (const file of files) {
    const text = fs.readFileSync(path.join(outputDir, file), 'utf8');
    const doc = YAML.parse(text);
    if (!Array.isArray(doc.subjects)) {
      throw new Error(`${file}: subjects must be an array`);
    }

    const after = doc?.preference?.animegarden?.after;
    if (typeof after !== 'string' || !after.trim()) {
      throw new Error(`${file}: preference.animegarden.after must be non-empty string`);
    }

    for (const subject of doc.subjects) {
      if (names.has(subject.name)) {
        throw new Error(`${file}: duplicate subject name ${subject.name}`);
      }
      names.set(subject.name, file);

      const driver = subject?.storage?.driver ?? 'default';
      const storagePath = subject?.storage?.path ?? subject.name;
      const normalizedPath = normalizeStoragePath(storagePath);

      const entries = byDriver.get(driver) ?? [];
      for (const entry of entries) {
        const left = entry.path;
        const right = normalizedPath;
        if (
          left === right ||
          left.startsWith(`${right}/`) ||
          right.startsWith(`${left}/`) ||
          left === '' ||
          right === ''
        ) {
          throw new Error(
            `${file}: storage path conflict under driver ${driver}: ${entry.name} <-> ${subject.name}`
          );
        }
      }
      entries.push({ name: subject.name, path: normalizedPath });
      byDriver.set(driver, entries);

      const source = subject.source ?? {};
      const hasSearch =
        (Array.isArray(source.include) && source.include.length > 0) ||
        (Array.isArray(source.keywords) && source.keywords.length > 0) ||
        (Array.isArray(source.search) && source.search.length > 0) ||
        (Array.isArray(source.subjects) && source.subjects.length > 0);
      if (!hasSearch) {
        throw new Error(`${file}: subject ${subject.name} has no source search key`);
      }
    }
  }
}

function parseArgs(argv) {
  const args = {
    from: 'example_space/plans',
    to: 'example_space/collections'
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === '--from' && next) {
      args.from = next;
      i++;
      continue;
    }
    if (token === '--to' && next) {
      args.to = next;
      i++;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(
        'Usage: node scripts/migrate-plans-to-collections.mjs [--from <plansDir>] [--to <collectionsDir>]'
      );
      process.exit(0);
    }
  }

  return args;
}

function main() {
  const { from, to } = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(from);
  const outputDir = path.resolve(to);

  if (!fs.existsSync(inputDir)) {
    throw new Error(`input directory does not exist: ${inputDir}`);
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  const usedSubjectNames = new Set();
  let totalSubjects = 0;

  for (const file of files) {
    const fileBase = file.replace(/\.yaml$/, '');
    const raw = fs.readFileSync(path.join(inputDir, file), 'utf8');
    const plan = YAML.parse(raw) ?? {};

    const planStatus = plan.status === 'finish' ? 'finish' : 'onair';
    const collectionEnabled = planStatus === 'onair';
    const collectionName =
      (typeof plan.title === 'string' && plan.title.trim()) ||
      (typeof plan.name === 'string' && plan.name.trim()) ||
      fileBase;

    const collection = {
      name: collectionName,
      enabled: collectionEnabled,
      preference: {
        animegarden: {
          after: toLocalDateTime(plan.date, fileBase)
        }
      },
      subjects: []
    };

    const onair = Array.isArray(plan.onair) ? plan.onair : [];
    for (let index = 0; index < onair.length; index++) {
      const rawSubject = onair[index] ?? {};
      const title = typeof rawSubject.title === 'string' ? rawSubject.title.trim() : '';
      if (!title) continue;

      const sourceKeywords = resolveLegacyKeywords(rawSubject);
      const preferenceExclude = toStringArray(rawSubject?.preference?.keyword?.exclude);
      const sourceExclude = dedupe([...sourceKeywords.exclude, ...preferenceExclude]);

      let sourceInclude = sourceKeywords.include;
      if (sourceInclude.length === 0) {
        sourceInclude = dedupe([
          title,
          ...toStringArray(rawSubject.alias),
          ...flattenTranslations(rawSubject.translations)
        ]);
      }
      if (sourceInclude.length === 0) {
        sourceInclude = [title];
      }

      const source = { include: sourceInclude };
      if (sourceExclude.length > 0) {
        source.exclude = sourceExclude;
      }

      const fansubs = toStringArray(rawSubject.fansub);
      if (fansubs.length > 0) {
        source.fansub = fansubs;
      }

      const keywordOrder = rawSubject?.preference?.keyword?.order;
      if (keywordOrder && typeof keywordOrder === 'object' && !Array.isArray(keywordOrder)) {
        const mapped = {};
        for (const [key, value] of Object.entries(keywordOrder)) {
          const list = toStringArray(value);
          if (list.length > 0) mapped[key] = list;
        }
        if (Object.keys(mapped).length > 0) {
          source.order = { keywords: mapped };
        }
      }

      const rewriteRules = [];
      const rewrite =
        rawSubject.rewrite && typeof rawSubject.rewrite === 'object' ? rawSubject.rewrite : null;
      if (rewrite) {
        if (Number.isFinite(rewrite.season)) {
          rewriteRules.push({ apply: { season: Number(rewrite.season) } });
        }

        if (rewrite.episode !== undefined) {
          if (Number.isFinite(rewrite.episode)) {
            rewriteRules.push({ apply: { episode: Number(rewrite.episode) } });
          } else if (rewrite.episode && typeof rewrite.episode === 'object') {
            const apply = {};
            if (Number.isFinite(rewrite.episode.offset)) {
              apply.episode_offset = Number(rewrite.episode.offset);
            }
            const matchedFansubs = toStringArray(rewrite.episode.fansub);
            if (Object.keys(apply).length > 0) {
              if (matchedFansubs.length > 0) {
                rewriteRules.push({
                  match: { fansub: matchedFansubs },
                  apply
                });
              } else {
                rewriteRules.push({ apply });
              }
            }
          }
        }
      }
      if (rewriteRules.length > 0) {
        source.rewrite = rewriteRules;
      }

      const naming = {};
      if (rewrite && typeof rewrite.title === 'string' && rewrite.title.trim()) {
        naming.name = rewrite.title.trim();
      }
      if (Number.isFinite(rawSubject.season)) {
        naming.season = Number(rawSubject.season);
      }

      const format = rawSubject?.preference?.format;
      if (format && typeof format === 'object') {
        const tvTemplate = convertTemplate(format.episode);
        const movieTemplate = convertTemplate(format.film) ?? convertTemplate(format.ova);
        const template = {};
        if (tvTemplate) template.TV = tvTemplate;
        if (movieTemplate) template.Movie = movieTemplate;
        if (Object.keys(template).length > 0) {
          naming.template = template;
        }
      }

      let subjectName = title;
      if (usedSubjectNames.has(subjectName)) {
        const candidates = [
          typeof rawSubject.directory === 'string' ? rawSubject.directory.trim() : '',
          `${title} (${fileBase})`,
          Number.isFinite(Number(rawSubject.bgm)) ? `${title} (${Number(rawSubject.bgm)})` : '',
          `${title} #${index + 1}`
        ];
        for (const candidate of candidates) {
          if (candidate && !usedSubjectNames.has(candidate)) {
            subjectName = candidate;
            break;
          }
        }
      }
      usedSubjectNames.add(subjectName);

      const subject = { name: subjectName };

      const subjectStatus =
        rawSubject.status === 'finish' || rawSubject.status === 'onair'
          ? rawSubject.status
          : planStatus;
      const subjectEnabled = subjectStatus === 'onair';
      if (subjectEnabled !== collectionEnabled) {
        subject.enabled = subjectEnabled;
      }

      const bgm = Number(rawSubject.bgm);
      if (Number.isFinite(bgm)) {
        subject.bgm = bgm;
      }

      const storage = {};
      if (
        typeof rawSubject.storage === 'string' &&
        rawSubject.storage.trim() &&
        rawSubject.storage.trim() !== 'anime'
      ) {
        storage.driver = rawSubject.storage.trim();
      }
      if (typeof rawSubject.directory === 'string' && rawSubject.directory.trim()) {
        storage.path = rawSubject.directory.trim();
      }
      if (Object.keys(storage).length > 0) {
        subject.storage = storage;
      }

      if (Object.keys(naming).length > 0) {
        subject.naming = naming;
      }

      subject.source = source;
      collection.subjects.push(subject);
      totalSubjects++;
    }

    const yamlText = YAML.stringify(collection, { lineWidth: 0, minContentWidth: 0 });
    const formatted = applySpacing(yamlText);
    fs.writeFileSync(path.join(outputDir, file), formatted);
  }

  validateOutput(files, outputDir);
  console.log(`migrated ${files.length} files, ${totalSubjects} subjects`);
}

main();
