#!/usr/bin/env node
'use strict';
/**
 * validate-data.js — zero-dependency schema check for data/glossary.json.
 * Prints all problems and exits non-zero if any are found, so CI can gate on it.
 */
const fs = require('fs');
const path = require('path');

const FILE = 'data/glossary.json';
const errors = [];
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = (v) => Array.isArray(v);
const err = (m) => errors.push(`${FILE}: ${m}`);

let d;
try {
  d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', FILE), 'utf8'));
} catch (e) {
  console.error(`${FILE}: invalid JSON — ${e.message}`);
  process.exit(1);
}

if (!d.meta) err('meta missing');
else for (const k of ['title', 'subtitle', 'description', 'language', 'lastUpdated', 'dataQualityNote']) {
  if (!isStr(d.meta[k])) err(`meta.${k} missing`);
}

const refIds = new Set();
if (!isArr(d.references) || d.references.length === 0) err('references[] missing or empty');
else d.references.forEach((r, i) => {
  const at = `references[${i}]`;
  if (!isStr(r.id)) err(`${at}.id missing`);
  else if (refIds.has(r.id)) err(`${at}.id duplicated: ${r.id}`);
  else refIds.add(r.id);
  if (!isStr(r.title)) err(`${at}.title missing`);
  if (!isStr(r.url) || !/^https?:\/\//.test(r.url)) err(`${at}.url must be an http(s) URL`);
  if (!isStr(r.publisher)) err(`${at}.publisher missing`);
  if (!isStr(r.type)) err(`${at}.type missing`);
});

const termIds = new Set();
if (!isArr(d.terms) || d.terms.length === 0) err('terms[] missing or empty');
else d.terms.forEach((t, i) => {
  const at = `terms[${i}]`;
  if (!isStr(t.id) || !/^[a-z0-9-]+$/.test(t.id)) err(`${at}.id must be a kebab-case slug`);
  else if (termIds.has(t.id)) err(`${at}.id duplicated: ${t.id}`);
  else termIds.add(t.id);
  if (!isStr(t.term)) err(`${at}.term missing`);
  if (!isStr(t.definition)) err(`${at}.definition missing (definitions only — and cited)`);
  if (!isArr(t.sources) || t.sources.length === 0) err(`${at}.sources empty (every definition must be cited)`);
  else for (const s of t.sources) if (!refIds.has(s)) err(`${at}.sources: unknown reference id "${s}"`);
  if (t.projects !== undefined && !isArr(t.projects)) err(`${at}.projects must be an array`);
  if (t.related !== undefined) {
    if (!isArr(t.related)) err(`${at}.related must be an array`);
  }
});
// related ids resolve (second pass, all ids known)
(d.terms || []).forEach((t, i) => {
  for (const r of t.related || []) if (!termIds.has(r)) err(`terms[${i}].related: unknown term id "${r}"`);
});

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${FILE} is valid (${d.terms.length} terms, ${d.references.length} references).`);
