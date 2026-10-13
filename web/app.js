'use strict';
(function () {
  const form = document.getElementById('audit-form');
  const result = document.getElementById('result-json');
  const status = document.getElementById('evaluation-status');
  const count = document.getElementById('task-count');
  const alertCount = document.getElementById('alert-count');
  const download = document.getElementById('download-json');
  const reset = document.getElementById('reset-form');
  let processed = 0;
  let lastResult = null;

  function setMessage(message, tone) {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    try {
      const payload = {
        task_id: document.getElementById('task_id').value,
        target_identifier: document.getElementById('target_identifier').value,
        primary_metric: document.getElementById('primary_metric').value,
        secondary_metric: document.getElementById('secondary_metric').value,
        status_descriptor: document.getElementById('status_descriptor').value,
        is_critical_flag: document.getElementById('is_critical_flag').checked
      };
      lastResult = DILIHeuristics.evaluateTask(payload);
      processed += 1;
      count.textContent = String(processed);
      alertCount.textContent = String(lastResult.total_alerts);
      setMessage('Rule evaluation: ' + lastResult.overall_urgency, lastResult.critical_alerts_count ? 'critical' : lastResult.total_alerts ? 'warning' : 'nominal');
      result.textContent = JSON.stringify(lastResult, null, 2);
      download.disabled = false;
    } catch (error) {
      lastResult = null;
      download.disabled = true;
      alertCount.textContent = '—';
      result.textContent = 'Correct the inputs and run the evaluation again.';
      setMessage('Input error: ' + error.message, 'error');
    }
  });

  reset.addEventListener('click', function () {
    form.reset();
    lastResult = null;
    result.textContent = 'Run an evaluation to see an unsigned dossier.';
    alertCount.textContent = '—';
    download.disabled = true;
    setMessage('Ready for local evaluation', 'neutral');
  });

  download.addEventListener('click', function () {
    if (!lastResult) return;
    const blob = new Blob([JSON.stringify(lastResult, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dili-rule-evaluation.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
})();
