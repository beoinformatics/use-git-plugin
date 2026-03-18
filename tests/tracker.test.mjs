import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRegisteredTestCommand, didTestsPass, extractFilePath } from '../scripts/usegit-tracker.mjs';

describe('isRegisteredTestCommand', () => {
  it('matches exact registered command', () => {
    assert.ok(isRegisteredTestCommand('pytest', 'pytest'));
  });

  it('matches when registered command is part of a longer command', () => {
    assert.ok(isRegisteredTestCommand('pytest tests/ -v', 'pytest'));
    assert.ok(isRegisteredTestCommand('npm test -- --watch', 'npm test'));
  });

  it('does not match unrelated commands', () => {
    assert.ok(!isRegisteredTestCommand('python test_quick.py', 'pytest'));
    assert.ok(!isRegisteredTestCommand('node server.js', 'npm test'));
  });

  it('returns false when test_command is null', () => {
    assert.ok(!isRegisteredTestCommand('pytest', null));
  });

  it('returns false when test_command is "none"', () => {
    assert.ok(!isRegisteredTestCommand('pytest', 'none'));
  });

  it('returns false when command is empty', () => {
    assert.ok(!isRegisteredTestCommand('', 'pytest'));
    assert.ok(!isRegisteredTestCommand(null, 'pytest'));
  });
});

describe('didTestsPass', () => {
  it('detects jest/vitest pass output', () => {
    assert.ok(didTestsPass('Tests: 5 passed, 5 total'));
    assert.ok(didTestsPass('3 passed'));
  });

  it('detects pytest pass output', () => {
    assert.ok(didTestsPass('5 passed in 1.23s'));
  });

  it('detects go test pass output', () => {
    assert.ok(didTestsPass('PASS\nok  mypackage  0.5s'));
    assert.ok(didTestsPass('ok  mypackage  0.5s'));
  });

  it('detects cargo test pass output', () => {
    assert.ok(didTestsPass('test result: ok. 10 passed; 0 failed'));
  });

  it('detects generic all tests passed', () => {
    assert.ok(didTestsPass('All tests passed'));
  });

  it('does not match random output', () => {
    assert.ok(!didTestsPass('compiled successfully'));
    assert.ok(!didTestsPass('server started on port 3000'));
  });

  it('returns false for empty/null output', () => {
    assert.ok(!didTestsPass(''));
    assert.ok(!didTestsPass(null));
  });
});

describe('extractFilePath', () => {
  it('extracts file_path from object', () => {
    assert.equal(extractFilePath({ file_path: '/src/app.ts' }), '/src/app.ts');
  });

  it('extracts filePath from object', () => {
    assert.equal(extractFilePath({ filePath: '/src/app.ts' }), '/src/app.ts');
  });

  it('extracts from JSON string', () => {
    assert.equal(
      extractFilePath('{"file_path": "/src/app.ts"}'),
      '/src/app.ts'
    );
  });

  it('returns null for missing path', () => {
    assert.equal(extractFilePath({ command: 'ls' }), null);
  });

  it('returns null for null input', () => {
    assert.equal(extractFilePath(null), null);
  });
});
