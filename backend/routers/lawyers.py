# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import Optional
from db.database import get_db
from db.models import Lawyer

router = APIRouter()


@router.get("")
def list_lawyers(
    city: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Lawyer).filter(Lawyer.is_active == True)
    if city:
        q = q.filter(Lawyer.city == city)
    if area:
        q = q.filter(Lawyer.area == area)
    return [l.to_dict() for l in q.order_by(Lawyer.name).all()]
