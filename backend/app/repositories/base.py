"""Generic base repository with common CRUD operations.

UNSET sentinel
--------------
`update()` previously skipped any kwarg whose value was `None`, making it
impossible to deliberately clear a nullable field.

Now callers use the `UNSET` singleton as the default for any field they do
NOT want to change, and pass `None` explicitly when they want to set NULL:

    # Change only the title; leave everything else alone
    repo.update(id, title="New Title")

    # Clear faculty_id (set it to NULL in the DB)
    repo.update(id, faculty_id=None)

    # The old pattern (omitting a kwarg) still works because Python
    # default-argument omission is equivalent to not passing UNSET.

Call sites that already omit kwargs they don't want changed are unaffected.
"""

from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

from sqlalchemy.orm import Session

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class _UnsetType:
    """Sentinel: field was not provided to update() — do not touch it."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:
        return "UNSET"


#: Pass this as a keyword-argument value to update() to mean "leave unchanged".
#: Omitting a kwarg entirely has the same effect because Python default args
#: default to UNSET in the helper below.
UNSET = _UnsetType()


class BaseRepository(Generic[ModelType]):
    """Generic repository providing CRUD operations for any SQLAlchemy model."""

    def __init__(self, model: type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters,
    ) -> list[ModelType]:
        q = self.db.query(self.model)
        for attr, value in filters.items():
            if hasattr(self.model, attr) and value is not None:
                q = q.filter(getattr(self.model, attr) == value)
        return q.offset(skip).limit(limit).all()

    def create(self, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, id: int, **kwargs) -> Optional[ModelType]:
        """Update fields on an existing object.

        - Omitted kwargs (or kwargs set to UNSET) are not touched.
        - kwargs set to None set the DB column to NULL (if the column is nullable).

        Examples::

            repo.update(1, title="New")          # only changes title
            repo.update(1, faculty_id=None)       # sets faculty_id to NULL
            repo.update(1, is_active=False)       # sets is_active to False
        """
        obj = self.get(id)
        if obj is None:
            return None
        for key, value in kwargs.items():
            if isinstance(value, _UnsetType):
                continue                          # caller omitted this field — skip
            if hasattr(obj, key):
                setattr(obj, key, value)          # None → sets NULL; any other → updates
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: int) -> bool:
        obj = self.get(id)
        if obj is None:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True
