"""
Generic CRUD operations, parameterized over a model type. Per-model modules
subclass this to get get/get_multi/create/update/delete for free, and add
any model-specific queries on top (see crud/user.py's get_by_email, etc).

This layer talks directly to SQLAlchemy models with plain kwargs — it does
NOT depend on Pydantic schemas. The API layer (Session 5) will sit on top
of this and handle request/response validation itself.
"""
from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base_class import Base

ModelType = TypeVar("ModelType", bound=Base)


class CRUDBase(Generic[ModelType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, db: Session, id: int) -> ModelType | None:
        return db.get(self.model, id)

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> list[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    def create(self, db: Session, *, obj_in: dict[str, Any]) -> ModelType:
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: ModelType, obj_in: dict[str, Any]) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, id: int) -> ModelType | None:
        db_obj = self.get(db, id)
        if db_obj is not None:
            db.delete(db_obj)
            db.commit()
        return db_obj
