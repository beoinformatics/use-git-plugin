import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNudge, isDestructiveCommand, NUDGES } from '../scripts/usegit-nudger.mjs';

describe('isDestructiveCommand', () => {
  it('detects rm -rf', () => {
    assert.ok(isDestructiveCommand('rm -rf node_modules'));
    assert.ok(isDestructiveCommand('rm -rf .'));
  });

  it('detects git checkout --', () => {
    assert.ok(isDestructiveCommand('git checkout -- .'));
    assert.ok(isDestructiveCommand('git checkout --.'));
  });

  it('detects git reset --hard', () => {
    assert.ok(isDestructiveCommand('git reset --hard HEAD'));
    assert.ok(isDestructiveCommand('git reset --hard'));
  });

  it('detects git clean', () => {
    assert.ok(isDestructiveCommand('git clean -fd'));
    assert.ok(isDestructiveCommand('git clean -f'));
  });

  it('detects git stash drop', () => {
    assert.ok(isDestructiveCommand('git stash drop'));
  });

  it('does not match safe commands', () => {
    assert.ok(!isDestructiveCommand('git status'));
    assert.ok(!isDestructiveCommand('git add .'));
    assert.ok(!isDestructiveCommand('git commit -m "test"'));
    assert.ok(!isDestructiveCommand('rm file.txt'));
    assert.ok(!isDestructiveCommand('git checkout main'));
    assert.ok(!isDestructiveCommand('git stash'));
  });

  it('returns false for null/empty', () => {
    assert.ok(!isDestructiveCommand(null));
    assert.ok(!isDestructiveCommand(''));
  });
});

describe('getNudge', () => {
  it('returns friendly nudge for tests_passed', () => {
    const result = getNudge('tests_passed', 'friendly');
    assert.ok(result.includes('tests are all passing'));
  });

  it('returns technical nudge for tests_passed', () => {
    const result = getNudge('tests_passed', 'technical');
    assert.ok(result.includes('Tests green'));
  });

  it('performs replacements', () => {
    const result = getNudge('edit_threshold', 'technical', { count: '15' });
    assert.ok(result.includes('15'));
  });

  it('falls back to friendly if voice not found', () => {
    const result = getNudge('tests_passed', 'unknown_voice');
    assert.ok(result.includes('tests are all passing'));
  });

  it('returns empty string for unknown key', () => {
    assert.equal(getNudge('nonexistent', 'friendly'), '');
  });
});

describe('NUDGES', () => {
  it('has all expected nudge keys', () => {
    assert.ok(NUDGES.tests_passed);
    assert.ok(NUDGES.edit_threshold);
    assert.ok(NUDGES.time_threshold);
    assert.ok(NUDGES.destructive);
  });

  it('each nudge has friendly and technical variants', () => {
    for (const [key, variants] of Object.entries(NUDGES)) {
      assert.ok(variants.friendly, `${key} missing friendly`);
      assert.ok(variants.technical, `${key} missing technical`);
    }
  });
});
