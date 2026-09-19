import { test, expect } from '../support/fixtures';
import * as api from '../support/api';
import { ITEMS } from '../fixtures/documents';

/**
 * Tests fixture vs system-produced data to identify harness drift
 */

const UNDECLARED = {
  '*': ['rarity.isrestricted'],
  itemmodifier: ['active', 'rank_current'],
};
const SPURIOUS = ['collection'];

/** Keys whose contents are a test's business, not the fixture's shape. */
const CONTENT = new Set([
  'attributes', 'itemmodifier', 'itemattachment', 'adjusteditemmodifer', 'adjusteditemmodifier',
  'talents', 'upgrades', 'careerSkills', 'specializations', 'signatureabilities',
  'abilities', 'species', 'description', 'longDesc', 'metadata',
]);

/** Map of dotted path -> type name, stopping at the containers above. */
function shape(value, path = '', out = new Map()) {
  const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (path) out.set(path, kind);
  if (kind !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (CONTENT.has(key)) {
      out.set(next, Array.isArray(child) ? 'array' : typeof child);
      continue;
    }
    shape(child, next, out);
  }
  return out;
}

function differences(fixture, bare, submitted, type) {
  const f = shape(fixture);
  const b = shape(bare);
  const s = shape(submitted);
  const undeclared = [...(UNDECLARED['*'] ?? []), ...(UNDECLARED[type] ?? [])];
  const allowed = (path) => undeclared.some((k) => path === k || path.startsWith(`${k}.`));
  const problems = [];

  for (const [path, kind] of f) {
    if (allowed(path)) continue;
    // Either reference will do: a field the sheet adds is as real as one the schema declares
    const reference = b.has(path) ? b : s.has(path) ? s : null;
    if (!reference) problems.push(`fixture invents "${path}" (${kind})`);
    else if (reference.get(path) !== kind) {
      problems.push(`"${path}" is ${kind} in the fixture, ${reference.get(path)} in the system`);
    }
  }
  // Only what the sheet adds - the schema's own keys are backfilled on create and need not be
  // spelled out in a fixture
  const spurious = (path) => SPURIOUS.some((k) => path === k || path.startsWith(`${k}.`));
  for (const [path, kind] of s) {
    if (spurious(path)) continue;
    if (!b.has(path) && !f.has(path)) {
      problems.push(`a sheet submit adds "${path}" (${kind}), the fixture does not have it`);
    }
  }
  return problems;
}

for (const [key, fixture] of Object.entries(ITEMS)) {
  test(`the ${key} fixture is a shape the system produces`, async ({ page }) => {
    const reference = await api.systemDefault(page, fixture.type);

    // A type the system cannot create bare is a finding of its own - say so rather than blaming
    // the fixture for not matching a document that could not be made
    expect(reference.error, `the system could not create a bare ${fixture.type}`).toBeUndefined();

    expect(differences(fixture.system, reference.bare, reference.system, fixture.type),
      'fixture matches the system shape').toEqual([]);
  });
}
