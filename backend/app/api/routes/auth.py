from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import RoleEnum
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserRead, UserRegister, UserUpdateMe

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if crud.user.get_by_email(db, email=payload.email) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = crud.user.create(
        db,
        obj_in={
            "full_name": payload.full_name,
            "email": payload.email,
            "phone_number": payload.phone_number,
            "hashed_password": hash_password(payload.password),
            "role": RoleEnum.citizen,
        },
    )
    token = create_access_token(subject=str(user.id))
    return Token(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    user = crud.user.get_by_email(db, email=payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise invalid
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdateMe,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.user.update(db, db_obj=current_user, obj_in=payload.model_dump(exclude_unset=True))
