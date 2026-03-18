import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { inferTestCommand, detectTestRunner } from '../scripts/usegit-init.mjs';

describe('inferTestCommand', () => {
  it('maps jest to npx jest', () => {
    assert.equal(inferTestCommand('jest'), 'npx jest');
  });

  it('maps vitest to npx vitest', () => {
    assert.equal(inferTestCommand('vitest'), 'npx vitest');
  });

  it('maps pytest to pytest', () => {
    assert.equal(inferTestCommand('pytest'), 'pytest');
  });

  it('maps cargo-test to cargo test', () => {
    assert.equal(inferTestCommand('cargo-test'), 'cargo test');
  });

  it('maps go-test to go test ./...', () => {
    assert.equal(inferTestCommand('go-test'), 'go test ./...');
  });

  it('maps mocha to npx mocha', () => {
    assert.equal(inferTestCommand('mocha'), 'npx mocha');
  });

  it('maps npm-test to npm test', () => {
    assert.equal(inferTestCommand('npm-test'), 'npm test');
  });

  it('returns null for unknown runner', () => {
    assert.equal(inferTestCommand('unknown'), null);
  });
});

describe('detectTestRunner', () => {
  const tmpDir = join(import.meta.dirname, '..', '.test-tmp');

  function setup() {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
  }

  function teardown() {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  }

  it('detects jest from jest.config.js', () => {
    setup();
    writeFileSync(join(tmpDir, 'jest.config.js'), 'module.exports = {};');
    assert.equal(detectTestRunner(tmpDir), 'jest');
    teardown();
  });

  it('detects vitest from vitest.config.ts', () => {
    setup();
    writeFileSync(join(tmpDir, 'vitest.config.ts'), 'export default {};');
    assert.equal(detectTestRunner(tmpDir), 'vitest');
    teardown();
  });

  it('detects pytest from pytest.ini', () => {
    setup();
    writeFileSync(join(tmpDir, 'pytest.ini'), '[pytest]');
    assert.equal(detectTestRunner(tmpDir), 'pytest');
    teardown();
  });

  it('detects pytest from pyproject.toml', () => {
    setup();
    writeFileSync(join(tmpDir, 'pyproject.toml'), '[tool.pytest.ini_options]\naddopts = "-v"');
    assert.equal(detectTestRunner(tmpDir), 'pytest');
    teardown();
  });

  it('detects cargo-test from Cargo.toml', () => {
    setup();
    writeFileSync(join(tmpDir, 'Cargo.toml'), '[package]\nname = "test"');
    assert.equal(detectTestRunner(tmpDir), 'cargo-test');
    teardown();
  });

  it('detects go-test from go.mod', () => {
    setup();
    writeFileSync(join(tmpDir, 'go.mod'), 'module example.com/test');
    assert.equal(detectTestRunner(tmpDir), 'go-test');
    teardown();
  });

  it('detects vitest from package.json devDependencies', () => {
    setup();
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest' },
      devDependencies: { vitest: '^1.0.0' },
    }));
    assert.equal(detectTestRunner(tmpDir), 'vitest');
    teardown();
  });

  it('detects jest from package.json devDependencies', () => {
    setup();
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'jest' },
      devDependencies: { jest: '^29.0.0' },
    }));
    assert.equal(detectTestRunner(tmpDir), 'jest');
    teardown();
  });

  it('returns npm-test for package.json with custom test script', () => {
    setup();
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'node run-tests.js' },
    }));
    assert.equal(detectTestRunner(tmpDir), 'npm-test');
    teardown();
  });

  it('ignores default npm test script', () => {
    setup();
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'echo "Error: no test specified" && exit 1' },
    }));
    assert.equal(detectTestRunner(tmpDir), null);
    teardown();
  });

  it('returns null for empty directory', () => {
    setup();
    assert.equal(detectTestRunner(tmpDir), null);
    teardown();
  });
});
