"""Regression coverage for data handling and API errors."""
import pytest
from fastapi.testclient import TestClient

from cli import parse_csv_bool as parse_enterprise_bool
from dili_sentinel.cli import parse_csv_bool as parse_legacy_bool
from agents.base import AuditTrail, SecurityException
from agents.models import SystemTaskPayload
from agents.supervisor import SystemSupervisor
from agents.api import app


@pytest.mark.parametrize("parser", [parse_enterprise_bool, parse_legacy_bool])
@pytest.mark.parametrize("raw,expected", [
    ("False", False), ("false", False), ("0", False), ("", False),
    ("True", True), ("1", True), ("YES", True),
])
def test_csv_flag_parsing(parser, raw, expected):
    assert parser(raw) is expected


@pytest.mark.parametrize("parser", [parse_enterprise_bool, parse_legacy_bool])
def test_csv_flag_invalid_value(parser):
    with pytest.raises(ValueError):
        parser("maybe")


def test_whitespace_only_identifiers_and_controls_rejected():
    with pytest.raises(ValueError):
        SystemTaskPayload(task_id="  ", target_identifier="TARGET-1", primary_metric=1)
    with pytest.raises(ValueError):
        SystemTaskPayload(task_id="TASK-1", target_identifier="TARGET\n2", primary_metric=1)


def test_reject_phi_in_attributes():
    payload = SystemTaskPayload(
        task_id="TASK-1", target_identifier="TARGET-1", primary_metric=1,
        attributes={"free_text": "MRN-994827"},
    )
    with pytest.raises(SecurityException):
        SystemSupervisor().process_task(payload)


def test_api_rejects_sensitive_identifier_without_server_error():
    client = TestClient(app)
    response = client.post("/api/audit", json={
        "task_id": "TASK-1", "target_identifier": "MRN-994827", "primary_metric": 1,
    })
    assert response.status_code == 422
    assert "MRN-994827" not in response.text


def test_audit_trail_getter_returns_isolated_snapshot():
    trail = AuditTrail(secret_key="unit-test-only")
    trail.log("unit", "test", "CASE", {"ok": True})
    snapshot = trail.get_trail()
    snapshot[0]["payload_hash"] = "modified"
    assert trail.verify_integrity() is True
