"""Application exceptions."""
from app.core.exceptions import NotFoundError


class ApplicationNotFoundError(NotFoundError):
    def __init__(self, application_id: str):
        super().__init__(f"Application {application_id} not found")
