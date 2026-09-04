"""
Security and Input Validation Tests for Drug Induced Liver Injury Dili.
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from agents.base import PHIGuard, AuditLogger, SecurityException, AuditTrail
from agents.models import SystemTaskPayload, UrgencyLevel


class TestPHIGuard:
    """Tests for the Zero-PHI Outbound Guard."""

    def test_mrn_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("Patient MRN-994827 blood culture positive")

    def test_ssn_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("SSN: 123-45-6789")

    def test_phone_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("Call patient at 555-123-4567")

    def test_email_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("Email patient at john@example.com")

    def test_dob_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("DOB: 01/15/1985")

    def test_patient_name_detection(self):
        with pytest.raises(SecurityException):
            PHIGuard.assert_no_phi("Patient Name: John Smith")

    def test_clean_text_passes(self):
        PHIGuard.assert_no_phi("Analytical assay specimen KEY-001 optimal")
        PHIGuard.assert_no_phi("Task TASK-2026-001 processed successfully")

    def test_empty_text_passes(self):
        PHIGuard.assert_no_phi("")

    def test_redact_phi(self):
        result = PHIGuard.redact_phi("Patient MRN-994827 has SSN 123-45-6789")
        assert "MRN" not in result
        assert "123-45-6789" not in result
        assert "[REDACTED_IDENTIFIER]" in result


class TestAuditTrailSecurity:
    """Tests for the HMAC-SHA256 Audit Trail security."""

    def test_audit_trail_requires_secret_key(self):
        # Ensure no env var is set for this test
        original_key = os.environ.pop("AUDIT_SECRET_KEY", None)
        try:
            with pytest.raises(SecurityException):
                AuditTrail(secret_key=None)
        finally:
            if original_key:
                os.environ["AUDIT_SECRET_KEY"] = original_key

    def test_audit_trail_accepts_secret_key(self):
        trail = AuditTrail(secret_key="test-secret-key-for-testing-only")
        assert trail.secret_key == b"test-secret-key-for-testing-only"

    def test_audit_trail_accepts_env_var(self):
        os.environ["AUDIT_SECRET_KEY"] = "env-based-test-key"
        try:
            trail = AuditTrail()
            assert trail.secret_key == b"env-based-test-key"
        finally:
            os.environ.pop("AUDIT_SECRET_KEY", None)

    def test_audit_integrity_verification(self):
        trail = AuditTrail(secret_key="integrity-test-key")
        trail.log("test_actor", "test_tier", "TEST_EVENT", {"data": "value1"})
        trail.log("test_actor", "test_tier", "TEST_EVENT", {"data": "value2"})
        assert trail.verify_integrity() is True

    def test_audit_tamper_detection(self):
        trail = AuditTrail(secret_key="tamper-test-key")
        trail.log("test_actor", "test_tier", "TEST_EVENT", {"data": "value1"})
        # Tamper with the first entry
        trail.logs[0]["payload_hash"] = "tampered_hash"
        assert trail.verify_integrity() is False


class TestInputValidation:
    """Tests for input validation on SystemTaskPayload."""

    def test_valid_payload(self):
        payload = SystemTaskPayload(
            task_id="TASK-001",
            target_identifier="TARGET-01",
            primary_metric=25.0,
            secondary_metric=10.0,
        )
        assert payload.task_id == "TASK-001"
        assert payload.primary_metric == 25.0

    def test_empty_task_id_rejected(self):
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="",
                target_identifier="TARGET-01",
                primary_metric=25.0,
            )

    def test_empty_target_rejected(self):
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK-001",
                target_identifier="",
                primary_metric=25.0,
            )

    def test_nan_metric_rejected(self):
        import math
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK-001",
                target_identifier="TARGET-01",
                primary_metric=math.nan,
            )

    def test_inf_metric_rejected(self):
        import math
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK-001",
                target_identifier="TARGET-01",
                primary_metric=math.inf,
            )

    def test_negative_inf_metric_rejected(self):
        import math
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK-001",
                target_identifier="TARGET-01",
                primary_metric=-math.inf,
            )

    def test_task_id_stripped(self):
        payload = SystemTaskPayload(
            task_id="  TASK-001  ",
            target_identifier="TARGET-01",
            primary_metric=25.0,
        )
        assert payload.task_id == "TASK-001"

    def test_control_chars_rejected(self):
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK\x00001",
                target_identifier="TARGET-01",
                primary_metric=25.0,
            )

    def test_long_task_id_rejected(self):
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="T" * 200,
                target_identifier="TARGET-01",
                primary_metric=25.0,
            )

    def test_long_status_descriptor_rejected(self):
        with pytest.raises(Exception):
            SystemTaskPayload(
                task_id="TASK-001",
                target_identifier="TARGET-01",
                primary_metric=25.0,
                status_descriptor="D" * 100,
            )
