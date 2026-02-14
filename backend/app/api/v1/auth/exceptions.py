"""Auth exceptions."""
from app.core.exceptions import AppError


class AuthenticationError(AppError):
    def __init__(self, detail: str = "Invalid credentials"):
        super().__init__(detail)
        self.status_code = 401


class UserExistsError(AppError):
    def __init__(self, email: str):
        super().__init__(f"User with email {email} already exists")
        self.status_code = 409
