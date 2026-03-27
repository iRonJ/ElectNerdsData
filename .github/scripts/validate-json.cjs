const fs = require('node:fs');
const path = require('node:path');

function walkJsonFiles(rootDir) {
  const out = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(fullPath);
    }
  }
  return out;
}

function isRecord(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function assertString(value, field, errors) {
  assert(typeof value === 'string', `${field} must be a string`, errors);
}

function assertNullableString(value, field, errors) {
  assert(value === null || typeof value === 'string', `${field} must be a string or null`, errors);
}

function assertStringArray(value, field, errors) {
  assert(Array.isArray(value), `${field} must be an array`, errors);
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      assert(typeof item === 'string', `${field}[${idx}] must be a string`, errors);
    });
  }
}

function validateCandidate(candidate, prefix, errors) {
  assert(isRecord(candidate), `${prefix} must be an object`, errors);
  if (!isRecord(candidate)) return;
  assertString(candidate.id, `${prefix}.id`, errors);
  assertString(candidate.name, `${prefix}.name`, errors);
  assertString(candidate.party, `${prefix}.party`, errors);
  assert(typeof candidate.isNerd === 'boolean', `${prefix}.isNerd must be a boolean`, errors);
  assert(
    typeof candidate.nerdScore === 'number' && Number.isFinite(candidate.nerdScore),
    `${prefix}.nerdScore must be a number`,
    errors
  );
  assertNullableString(candidate.nerdReason, `${prefix}.nerdReason`, errors);
  assertNullableString(candidate.notNerdReason, `${prefix}.notNerdReason`, errors);
  assertStringArray(candidate.keyIssues, `${prefix}.keyIssues`, errors);
  assertStringArray(candidate.education, `${prefix}.education`, errors);
  assertStringArray(candidate.experience, `${prefix}.experience`, errors);
  assertNullableString(candidate.website, `${prefix}.website`, errors);
  assertNullableString(candidate.imageUrl, `${prefix}.imageUrl`, errors);
}

function validateCandidateArray(value, field, errors) {
  assert(Array.isArray(value), `${field} must be an array`, errors);
  if (!Array.isArray(value)) return;
  value.forEach((candidate, idx) => validateCandidate(candidate, `${field}[${idx}]`, errors));
}

function validateFederalStateData(data, relPath, errors) {
  assert(isRecord(data), `${relPath} root must be an object`, errors);
  if (!isRecord(data)) return;
  assertString(data.state, `${relPath}.state`, errors);
  assertString(data.stateName, `${relPath}.stateName`, errors);
  assertString(data.stateFips, `${relPath}.stateFips`, errors);
  validateCandidateArray(data.senators, `${relPath}.senators`, errors);

  assert(isRecord(data.house), `${relPath}.house must be an object`, errors);
  if (isRecord(data.house)) {
    for (const [district, candidates] of Object.entries(data.house)) {
      validateCandidateArray(candidates, `${relPath}.house.${district}`, errors);
    }
  }
}

function validateStateLocalData(data, relPath, errors) {
  assert(isRecord(data), `${relPath} root must be an object`, errors);
  if (!isRecord(data)) return;
  assertString(data.state, `${relPath}.state`, errors);
  assertString(data.stateName, `${relPath}.stateName`, errors);
  assertString(data.stateFips, `${relPath}.stateFips`, errors);
  validateCandidateArray(data.governor, `${relPath}.governor`, errors);

  assert(isRecord(data.stateSenate), `${relPath}.stateSenate must be an object`, errors);
  if (isRecord(data.stateSenate)) {
    for (const [district, candidates] of Object.entries(data.stateSenate)) {
      validateCandidateArray(candidates, `${relPath}.stateSenate.${district}`, errors);
    }
  }

  assert(isRecord(data.stateHouse), `${relPath}.stateHouse must be an object`, errors);
  if (isRecord(data.stateHouse)) {
    for (const [district, candidates] of Object.entries(data.stateHouse)) {
      validateCandidateArray(candidates, `${relPath}.stateHouse.${district}`, errors);
    }
  }

  assert(isRecord(data.counties), `${relPath}.counties must be an object`, errors);
  if (isRecord(data.counties)) {
    for (const [countyKey, countyObj] of Object.entries(data.counties)) {
      const base = `${relPath}.counties.${countyKey}`;
      assert(isRecord(countyObj), `${base} must be an object`, errors);
      if (!isRecord(countyObj)) continue;
      assertString(countyObj.countyName, `${base}.countyName`, errors);
      validateCandidateArray(countyObj.candidates, `${base}.candidates`, errors);
    }
  }
}

function validatePresidentialData(data, relPath, errors) {
  assert(isRecord(data), `${relPath} root must be an object`, errors);
  if (!isRecord(data)) return;
  assertString(data.office, `${relPath}.office`, errors);
  assert(
    typeof data.cycle === 'number' && Number.isFinite(data.cycle),
    `${relPath}.cycle must be a number`,
    errors
  );
  validateCandidateArray(data.candidates, `${relPath}.candidates`, errors);
}

function validateGeoSources(data, relPath, errors) {
  assert(isRecord(data), `${relPath} root must be an object`, errors);
  if (!isRecord(data)) return;
  assertString(data.description, `${relPath}.description`, errors);
  assertString(data.states, `${relPath}.states`, errors);
  assertString(data.counties, `${relPath}.counties`, errors);
  assertString(data.congressionalDistricts, `${relPath}.congressionalDistricts`, errors);

  assert(isRecord(data.attribution), `${relPath}.attribution must be an object`, errors);
  if (isRecord(data.attribution)) {
    for (const [key, value] of Object.entries(data.attribution)) {
      assert(typeof value === 'string', `${relPath}.attribution.${key} must be a string`, errors);
    }
  }
}

function main() {
  const cwd = process.cwd();
  const files = walkJsonFiles(cwd);

  if (files.length === 0) {
    console.log('No JSON files found.');
    return;
  }

  let hasErrors = false;

  for (const fullPath of files) {
    const relPath = path.relative(cwd, fullPath).replace(/\\/g, '/');
    const fileErrors = [];
    let json;

    try {
      json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      fileErrors.push(`${relPath}: invalid JSON syntax (${message})`);
    }

    if (fileErrors.length === 0) {
      if (relPath === 'geo/sources.json') {
        validateGeoSources(json, relPath, fileErrors);
      } else if (relPath === 'candidates/federal/president.json') {
        validatePresidentialData(json, relPath, fileErrors);
      } else if (relPath.startsWith('candidates/federal/states/')) {
        validateFederalStateData(json, relPath, fileErrors);
      } else if (relPath.startsWith('candidates/state-local/')) {
        validateStateLocalData(json, relPath, fileErrors);
      }
    }

    if (fileErrors.length > 0) {
      hasErrors = true;
      console.error(`Validation failed for ${relPath}:`);
      for (const err of fileErrors) {
        console.error(`  - ${err}`);
      }
    }
  }

  if (hasErrors) {
    console.error('One or more JSON files failed validation.');
    process.exit(1);
  }

  console.log('All JSON files passed syntax and schema checks.');
}

main();
