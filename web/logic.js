/* Deterministic browser implementation of agents/workers.py thresholds.
   Operational demonstration only; these rules are not clinical DILI criteria. */
(function (root) {
  'use strict';

  function textField(value, name, maxLength) {
    if (typeof value !== 'string') throw new TypeError(name + ' must be text');
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f]/.test(trimmed)) {
      throw new RangeError(name + ' must contain 1–' + maxLength + ' characters without controls');
    }
    return trimmed;
  }

  function finiteMetric(value, name) {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim()) || typeof value === 'boolean') {
      throw new TypeError(name + ' is required and must be a finite number');
    }
    const result = Number(value);
    if (!Number.isFinite(result)) throw new RangeError(name + ' must be a finite number');
    return result;
  }

  function evaluateTask(raw) {
    if (!raw || typeof raw !== 'object') throw new TypeError('A task object is required');
    const task_id = textField(raw.task_id, 'Task ID', 128);
    const target_identifier = textField(raw.target_identifier, 'Target identifier', 128);
    const status_descriptor = textField(raw.status_descriptor === undefined ? 'NOMINAL' : raw.status_descriptor, 'Status descriptor', 64);
    const primary_metric = finiteMetric(raw.primary_metric, 'Primary metric');
    const secondary_metric = finiteMetric(raw.secondary_metric === undefined ? 0 : raw.secondary_metric, 'Secondary metric');
    if (typeof raw.is_critical_flag !== 'boolean' && raw.is_critical_flag !== undefined) {
      throw new TypeError('Critical flag must be a boolean');
    }
    const critical = raw.is_critical_flag === true;
    const alerts = [];
    if (primary_metric > 25) {
      alerts.push({
        origin_worker: 'InvariantQCWorker', urgency: 'ELEVATED_RISK',
        summary: 'Primary metric threshold exceeded',
        technical_details: 'Primary metric ' + primary_metric + ' exceeds illustrative threshold 25.',
        actionable_remediation: 'Review the input and domain-specific limits.'
      });
    }
    if (critical || secondary_metric > 12) {
      alerts.push({
        origin_worker: 'SafetyEscalationWorker', urgency: critical ? 'CRITICAL_STAT_PANIC' : 'ELEVATED_RISK',
        summary: 'Safety escalation condition triggered',
        technical_details: 'Manual critical flag: ' + critical + '; secondary metric: ' + secondary_metric + ' (illustrative threshold 12).',
        actionable_remediation: 'Review the flag and source measurements.'
      });
    }
    if (['DISCORDANT', 'ANOMALY', 'MUTANT', 'VIOLATION', 'FAIL', 'REJECT'].some(flag => status_descriptor.toUpperCase().includes(flag))) {
      alerts.push({
        origin_worker: 'ProtocolConformanceWorker', urgency: 'ELEVATED_RISK',
        summary: 'Descriptor-based discordance flag',
        technical_details: 'Descriptor "' + status_descriptor + '" matched an illustrative keyword rule.',
        actionable_remediation: 'Check descriptor accuracy and the source protocol.'
      });
    }
    const critical_alerts_count = alerts.filter(a => a.urgency === 'CRITICAL_STAT_PANIC').length;
    const overall_urgency = critical_alerts_count ? 'CRITICAL_STAT_PANIC' : alerts.length ? 'ELEVATED_RISK' : 'ROUTINE';
    const integrity_status = critical_alerts_count ? 'RECALIBRATION_REQUIRED' : alerts.length ? 'DISCORDANT_ANOMALY' : 'VALIDATED_OPTIMAL';
    return {
      system_slug: 'drug-induced-liver-injury-dili',
      mode: 'browser-local-unsigned',
      task_id, target_identifier, primary_metric, secondary_metric, status_descriptor,
      is_critical_flag: critical, overall_urgency, integrity_status,
      total_alerts: alerts.length, critical_alerts_count, alerts,
      consensus_summary: 'Illustrative rule evaluation completed; not a validated DILI assessment.'
    };
  }

  const api = Object.freeze({ evaluateTask });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DILIHeuristics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
