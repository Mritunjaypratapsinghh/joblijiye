"""Test job service."""
import pytest
from unittest.mock import AsyncMock, patch

from app.services.job_service import JobService
from app.api.v1.jobs.exceptions import JobNotFoundError


@pytest.fixture
def job_service():
    return JobService()


@pytest.mark.asyncio
async def test_get_jobs_empty(job_service):
    with patch.object(job_service.repository, "get_all", new_callable=AsyncMock) as mock_get:
        with patch.object(job_service.repository, "count", new_callable=AsyncMock) as mock_count:
            mock_get.return_value = []
            mock_count.return_value = 0
            
            result = await job_service.get_jobs()
            
            assert result["jobs"] == []
            assert result["total"] == 0


@pytest.mark.asyncio
async def test_get_job_not_found(job_service):
    with patch.object(job_service.repository, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        
        with pytest.raises(JobNotFoundError):
            await job_service.get_job("nonexistent-id")
