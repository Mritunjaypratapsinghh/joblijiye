"""Resume exceptions."""
from app.core.exceptions import NotFoundError, AppError


class ResumeNotFoundError(NotFoundError):
    def __init__(self, resume_id: str):
        super().__init__(f"Resume {resume_id} not found")


class ResumeGenerationError(AppError):
    def __init__(self, detail: str):
        super().__init__(f"Resume generation failed: {detail}")
