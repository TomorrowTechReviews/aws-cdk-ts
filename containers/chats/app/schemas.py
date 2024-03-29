from pydantic import BaseModel
from uuid import UUID


class ChatBase(BaseModel):
    id: UUID
    title: str


class ChatCreate(BaseModel):
    title: str


class Chat(ChatBase):
    class Config:
        orm_mode = True


class ChatMessageBase(BaseModel):
    chat_id: UUID
    message: str
    role: str


class ChatMessageCreate(BaseModel):
    message: str
    role: str


class ChatMessage(ChatMessageBase):
    class Config:
        orm_mode = True


class AuthUser(BaseModel):
    id: str
