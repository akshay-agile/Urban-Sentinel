"""
Shared declarative base. Every model in app/models/ inherits from this.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
