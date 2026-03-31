"""Phase 2 tests — connections, schedule, and analytics endpoints."""

import os
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_iterant.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["SCHEDULER_ENABLED"] = "false"

from app.database import Base, get_db
from app.main import app
from app.models import ContentPiece, ScheduledPost

test_engine = create_engine("sqlite:///./test_iterant.db", connect_args={"check_same_thread": False})
