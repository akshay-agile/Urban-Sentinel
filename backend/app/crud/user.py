from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.enums import PlatformEnum
from app.models.user import User


class CRUDUser(CRUDBase[User]):
    def get_by_email(self, db: Session, *, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return db.scalars(stmt).first()

    def get_active_citizens_with_location(self, db: Session) -> list[User]:
        """
        Registered citizens who have a known location and are reachable
        for a notification — the candidate pool the Radius Engine
        (Session 9) filters by distance.

        "Reachable" means either a push token (Android — real FCM push)
        OR platform is iOS (foreground-only local notifications per the
        Session 6/10 decision, which by design never gets a push token).
        Without the iOS branch here, iOS users would never be matched at
        all — this was a bug from Session 2 that only became visible once
        Session 10 actually tried to deliver notifications.
        """
        stmt = select(User).where(
            User.is_active.is_(True),
            User.latitude.is_not(None),
            User.longitude.is_not(None),
            or_(User.push_token.is_not(None), User.platform == PlatformEnum.ios),
        )
        return list(db.scalars(stmt).all())


user = CRUDUser(User)
