from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..schemas import ChatCreate, Chat, AuthUser
from ..dependencies import get_db
from .. import crud
from .. import auth

router = APIRouter()


def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n - 1) + fibonacci(n - 2)


def load_cpu():
    results = []
    for n in range(10):
        result = fibonacci(12)
        results.append(result)
    return results


@router.get("/chats", response_model=list[Chat])
def list_chats(
    user: Annotated[AuthUser, Depends(auth.get_current_user)],
    db: Session = Depends(get_db),
):
    load_cpu()
    return crud.get_chats_by_user(db=db, user_id=user.id)


@router.post("/chats", response_model=Chat)
def create_chat(
    user: Annotated[AuthUser, Depends(auth.get_current_user)],
    chat: ChatCreate,
    db: Session = Depends(get_db),
):
    return crud.create_chat(db=db, chat=chat, user_id=user.id)
