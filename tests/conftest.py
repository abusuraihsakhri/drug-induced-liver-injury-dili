"""
Pytest configuration: set test environment variables before importing modules.
"""
import os

# Set a test-only secret key for audit trail cryptographic signing.
# This key is used exclusively for test execution and is never used in production.
os.environ.setdefault("AUDIT_SECRET_KEY", "test-secret-key-that-is-32-chars-long!!")
