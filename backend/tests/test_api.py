"""Smoke tests for Iterant backend API."""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_iterant.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from app.database import Base, get_db
from app.main import app

# Create test database
test_engine = create_engine("sqlite:///./test_iterant.db", connect_args={"check_same_thread": False})
