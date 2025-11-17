# Add 'jsonable_encoder' to your imports from fastapi
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.encoders import jsonable_encoder # <-- 1. IMPORT THIS
from typing import Annotated

from backend.models.user_model import UserCreate, Token, UserInDB
from backend.utils.auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(request: Request, user_data: UserCreate):
    user_collection = request.app.db["users"]
    
    if await user_collection.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(email=user_data.email, hashed_password=hashed_password)
    
    # <-- 2. USE jsonable_encoder HERE instead of .dict()
    user_to_insert = jsonable_encoder(user_in_db)
    
    await user_collection.insert_one(user_to_insert)
    
    return {"message": f"User {user_data.email} registered successfully"}

# --- No changes are needed for the /token endpoint below this line ---

@router.post("/token", response_model=Token)
async def login_for_access_token(request: Request, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user_collection = request.app.db["users"]
    user = await user_collection.find_one({"email": form_data.username})

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}