from sqlalchemy.orm import Session
from uuid import UUID
from . import models, schemas


def get_chat(db: Session, chat_id: int):
    return db.query(models.Chat).filter(models.Chat.id == chat_id).first()


def get_chats_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Chat)
        .filter(models.Chat.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_chat(db: Session, chat: schemas.ChatCreate, user_id: str):
    db_chat = models.Chat(title=chat.title, user_id=user_id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat


def create_chat_message(
    db: Session, chat_message: schemas.ChatMessageCreate, chat_id: UUID, user_id: str
):
    db_message = models.ChatMessage(
        chat_id=chat_id,
        message=chat_message.message,
        role=chat_message.role,
        user_id=user_id,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message
