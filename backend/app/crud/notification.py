from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.notification import Notification


class CRUDNotification(CRUDBase[Notification]):
    def get_for_user(self, db: Session, *, user_id: int, limit: int = 50) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(db.scalars(stmt).all())


notification = CRUDNotification(Notification)
