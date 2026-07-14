from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.user import User


class CRUDUser(CRUDBase[User]):
    def get_by_email(self, db: Session, *, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return db.scalars(stmt).first()

    def get_active_citizens_with_location(self, db: Session) -> list[User]:
        """
        Registered citizens who have a known location and push token —
        the candidate pool the Radius Engine (Session 9) will filter by
        distance. Kept here now so that engine has a ready-made query.
        """
        stmt = select(User).where(
            User.is_active.is_(True),
            User.latitude.is_not(None),
            User.longitude.is_not(None),
            User.push_token.is_not(None),
        )
        return list(db.scalars(stmt).all())


user = CRUDUser(User)
