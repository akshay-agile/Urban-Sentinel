from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_current_authority, get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationRead, NotificationUpdate

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/mine", response_model=list[NotificationRead])
def list_my_notifications(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return only the authenticated recipient's persisted delivery records."""
    return crud.notification.get_for_user(db, user_id=current_user.id, limit=min(max(limit, 1), 200))


@router.get("/", response_model=list[NotificationRead])
def list_notifications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    return crud.notification.get_multi(db, skip=skip, limit=limit)


@router.get("/user/{user_id}", response_model=list[NotificationRead])
def get_notifications_for_user(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role.value != "authority":
        raise HTTPException(status_code=403, detail="Cannot access another user's notifications")
    if crud.user.get(db, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.notification.get_for_user(db, user_id=user_id, limit=limit)


@router.get("/{notification_id}", response_model=NotificationRead)
def get_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = crud.notification.get(db, notification_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if obj.user_id != current_user.id and current_user.role.value != "authority":
        raise HTTPException(status_code=403, detail="Cannot access another user's notification")
    return obj


@router.post("/", response_model=NotificationRead, status_code=201)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    if crud.user.get(db, payload.user_id) is None:
        raise HTTPException(status_code=404, detail="user_id does not reference an existing user")
    if crud.incident.get(db, payload.incident_id) is None:
        raise HTTPException(status_code=404, detail="incident_id does not reference an existing incident")
    return crud.notification.create(db, obj_in=payload.model_dump())


@router.patch("/{notification_id}", response_model=NotificationRead)
def update_notification(notification_id: int, payload: NotificationUpdate, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    obj = crud.notification.get(db, notification_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return crud.notification.update(db, db_obj=obj, obj_in=payload.model_dump(exclude_unset=True))


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: int, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    obj = crud.notification.delete(db, id=notification_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Notification not found")
