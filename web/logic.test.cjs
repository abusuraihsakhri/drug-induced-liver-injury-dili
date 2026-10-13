'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateTask } = require('./logic.js');
const make = (changes = {}) => ({ task_id: 'TASK-1', target_identifier: 'SAMPLE-1', primary_metric: 10, secondary_metric: 4, status_descriptor: 'NOMINAL', is_critical_flag: false, ...changes });

test('nominal case mirrors Python worker boundaries', () => {
  const result = evaluateTask(make({ primary_metric: 25, secondary_metric: 12 }));
  assert.equal(result.overall_urgency, 'ROUTINE');
  assert.equal(result.total_alerts, 0);
  assert.equal(result.mode, 'browser-local-unsigned');
});

test('primary above 25 and secondary above 12 raise two elevated alerts', () => {
  const result = evaluateTask(make({ primary_metric: 25.01, secondary_metric: 12.01 }));
  assert.equal(result.total_alerts, 2);
  assert.equal(result.overall_urgency, 'ELEVATED_RISK');
});

test('critical manual flag takes precedence', () => {
  const result = evaluateTask(make({ is_critical_flag: true, status_descriptor: 'DISCORDANT' }));
  assert.equal(result.overall_urgency, 'CRITICAL_STAT_PANIC');
  assert.equal(result.critical_alerts_count, 1);
  assert.equal(result.total_alerts, 2);
});

test('trims names and uses case-insensitive descriptor matching', () => {
  const result = evaluateTask(make({ task_id: '  TASK-X  ', status_descriptor: 'anomaly' }));
  assert.equal(result.task_id, 'TASK-X');
  assert.equal(result.total_alerts, 1);
});

test('rejects missing and invalid numeric measurements', () => {
  for (const value of ['', '   ', NaN, Infinity, '-Infinity', null, 'oops']) {
    assert.throws(() => evaluateTask(make({ primary_metric: value })));
  }
});

test('rejects whitespace-only IDs, line breaks, oversized descriptors and string critical flags', () => {
  assert.throws(() => evaluateTask(make({ task_id: '   ' })));
  assert.throws(() => evaluateTask(make({ target_identifier: 'bad\nidentifier' })));
  assert.throws(() => evaluateTask(make({ status_descriptor: 'X'.repeat(65) })));
  assert.throws(() => evaluateTask(make({ is_critical_flag: 'false' })));
});
