"""Test configuration."""
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    mock = MagicMock()
    mock.table.return_value.select.return_value.execute.return_value.data = []
    return mock


@pytest.fixture
def mock_job_repository():
    """Mock job repository."""
    mock = AsyncMock()
    mock.get_all.return_value = []
    mock.count.return_value = 0
    return mock
