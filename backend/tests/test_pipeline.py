"""Tests for content pipeline endpoints — quick-expand, refine, and status updates."""

import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_iterant.db"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from app.database import Base, get_db
from app.main import app
from app.models import ContentPiece, Product
from app.permissions import get_current_user

test_engine = create_engine(
    "sqlite:///./test_iterant.db", connect_args={"check_same_thread": False}
)
