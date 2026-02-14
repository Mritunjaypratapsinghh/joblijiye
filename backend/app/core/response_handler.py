"""Response handler utilities."""
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError


def format_app_error(exc: AppError) -> JSONResponse:
    """Format AppError to JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.message},
    )


class GenericResponse:
    """Generic response builder."""

    @staticmethod
    def success(data=None, message: str = "Success"):
        return {"success": True, "message": message, "data": data}

    @staticmethod
    def error(message: str, detail: str = None):
        return {"success": False, "error": message, "detail": detail}
