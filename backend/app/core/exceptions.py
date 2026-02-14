"""Core exceptions."""


class AppError(Exception):
    """Base application error."""
    
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    """Resource not found."""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class ValidationError(AppError):
    """Validation error."""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=422)
