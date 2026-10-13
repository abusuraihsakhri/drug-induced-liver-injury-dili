# Drug-Induced Liver Injury (DILI) — Sentinel

### [Open the Live Application →](https://abusuraihsakhri.github.io/drug-induced-liver-injury-dili/)

A deterministic, educational rule-evaluation project with a browser console, two Python evaluation pipelines, a command-line interface, and a FastAPI service.

**Scope and evidence limitation:** The existing numerical cutoffs are illustrative operational thresholds, not established DILI diagnostic criteria or a clinically validated hepatotoxicity prediction model. The project does **not** compute Hy's law, RUCAM, molecular BSEP IC50, mitochondrial toxicity, reactive-metabolite production, or patient-level DILI probability. Do not use outputs to make clinical decisions.

## Browser application

The static console in `web/index.html` runs without a backend. It evaluates the same threshold and descriptor rules as `agents/workers.py`: primary metric **>25**, secondary metric **>12**, a manual critical flag, and status descriptor keywords. The values have no defined clinical units. Results appear in a readable dossier and can be downloaded as JSON.

After GitHub Pages is enabled and its deployment succeeds, the deployment workflow publishes the contents of `web/`. For local use:

```bash
python -m http.server 8001 --directory web
# Open http://localhost:8001/
```

JavaScript performs the browser evaluation directly. Pyodide is unnecessary for these simple rules. The browser version is **unsigned** and has no connection to the Python audit log; it does not impersonate an HMAC-backed service.

## Python installation

Requires Python 3.10–3.12 for the versions checked in CI. The package metadata supports Python 3.9 and later.

```bash
python -m pip install -e '.[server,test]'
```

For the main `agents/` workflow, set an audit signing key before starting the service or CLI:

```bash
export AUDIT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
python cli.py audit --task-id DEMO-01 --target SAMPLE-A --primary 28.5 --secondary 14.2
python cli.py batch -i sample.csv -o results.csv
python cli.py verify-audit
python cli.py serve --host 127.0.0.1 --port 8000
```

The main API exposes `GET /health`, `GET /metrics`, `POST /api/audit`, `POST /api/chat`, and `GET /api/audit/logs`. Interactive API documentation is available at `http://127.0.0.1:8000/docs` while the server is running. `/metrics` currently returns JSON counters, not Prometheus exposition format.

The separately packaged legacy workflow is invoked with `drug-induced-liver-injury-dili` (entry point `dili_sentinel.cli:main`) or `python -m dili_sentinel.cli`. It uses **different** generic secondary threshold logic (**>10**) and does **not** share the main API's signed audit trail. Its interfaces are maintained for compatibility, not interchangeable clinical interpretations. `enrichment.py` similarly contains illustrative threshold checks rather than mechanistic biochemical models.

## Testing

```bash
python -m pytest -v
node --check web/logic.js
node --check web/app.js
node --test web/logic.test.cjs
python simulator.py 100
```

GitHub Actions executes Python tests on 3.10, 3.11, and 3.12 and runs the JavaScript tests. Docker deployment is optional: set a private `AUDIT_SECRET_KEY` in your environment, then run `docker compose up --build`. Never commit audit keys.

## Privacy and limitations

- The browser app does not submit data to a remote API or persist it to browser storage. A JSON download is generated locally. Avoid entering personal health information.
- The Python workflow performs best-effort identifier pattern checks, **not** comprehensive anonymization or a HIPAA compliance guarantee. In-memory HMAC-SHA256 audit entries authenticate the process-local chain only; they are not durable, externally anchored logs.
- Browser results have no signatures; the two Python pipelines and browser rules have intentionally distinct interfaces. Neither pipeline is validated for clinical decision support.
- Use a current Chromium, Firefox, or Safari browser with JavaScript enabled. No external runtime libraries are required by the web console.

## License

[MIT](LICENSE).
