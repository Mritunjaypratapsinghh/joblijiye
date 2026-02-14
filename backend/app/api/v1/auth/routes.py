"""Auth routes - Custom authentication (no Supabase auth)."""
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport import requests
from google.oauth2 import id_token

from app.config import get_settings
from app.database import get_supabase_admin
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token
from app.core.rate_limit import limiter
from app.api.v1.auth.schemas import (
    UserRegister,
    UserLogin,
    GoogleAuth,
    TokenResponse,
    UserResponse,
    ProfileUpdate,
    ProfileResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_supabase_admin()
    result = db.table("users").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    
    return result.data


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UserRegister):
    """Register new user with email and password."""
    db = get_supabase_admin()
    
    # Check if email exists
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_data = {
        "email": data.email,
        "password_hash": get_password_hash(data.password),
        "full_name": data.full_name,
    }
    result = db.table("users").insert(user_data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Registration failed")
    
    user = result.data[0]
    
    # Create profile
    db.table("profiles").insert({"user_id": user["id"], "full_name": data.full_name}).execute()
    
    # Generate token
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    """Login with email and password."""
    db = get_supabase_admin()
    
    result = db.table("users").select("*").eq("email", data.email).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = result.data
    if not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_auth(request: Request, data: GoogleAuth):
    """Authenticate with Google OAuth."""
    settings = get_settings()
    
    try:
        idinfo = id_token.verify_oauth2_token(
            data.credential, 
            requests.Request(), 
            settings.google_client_id
        )
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    email = idinfo["email"]
    google_id = idinfo["sub"]
    full_name = idinfo.get("name")
    avatar_url = idinfo.get("picture")
    
    db = get_supabase_admin()
    
    # Check if user exists
    result = db.table("users").select("*").eq("email", email).execute()
    
    if result.data:
        user = result.data[0]
        # Link Google ID if not already linked
        if not user.get("google_id"):
            db.table("users").update({"google_id": google_id}).eq("id", user["id"]).execute()
    else:
        # Create new user
        user_data = {
            "email": email,
            "google_id": google_id,
            "full_name": full_name,
            "avatar_url": avatar_url,
        }
        result = db.table("users").insert(user_data).execute()
        user = result.data[0]
        
        # Create profile
        db.table("profiles").insert({"user_id": user["id"], "full_name": full_name}).execute()
    
    token = create_access_token({"sub": user["id"], "email": email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
    )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile."""
    db = get_supabase_admin()
    result = db.table("profiles").select("*").eq("user_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**result.data)


@router.patch("/profile", response_model=ProfileResponse)
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user's profile."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    db = get_supabase_admin()
    result = db.table("profiles").update(update_data).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**result.data[0])
