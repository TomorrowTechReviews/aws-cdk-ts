from fastapi import APIRouter, Depends, WebSocket, HTTPException
from uuid import UUID
from sqlalchemy.orm import Session
from ..dependencies import get_db
from ..schemas import ChatMessageCreate, ChatMessage
from .. import crud
from .. import auth

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, token: str, db: Session = Depends(get_db)
):
    user = await auth.get_current_user_ws(token)
    if not user:
        await websocket.close(code=1008)
        return

    user_id = user.id
    await websocket.accept()

    while True:
        data = await websocket.receive_json()
        if "chat_id" not in data or "message" not in data:
            await websocket.close(code=1003)
            raise HTTPException(
                status_code=400, detail="Missing chat_id or message in received data"
            )

        try:
            chat_id = UUID(data["chat_id"])
        except ValueError:
            await websocket.close(code=1003)
            raise HTTPException(status_code=400, detail="Invalid chat_id format")

        message_user = data["message"]
        message_reply = f"Reply to: {message_user}"

        db_message_user = crud.create_chat_message(
            db=db,
            user_id=user_id,
            chat_id=chat_id,
            chat_message=ChatMessageCreate(
                message=message_user,
                role="user",
            ),
        )

        db_message_reply = crud.create_chat_message(
            db=db,
            user_id=user_id,
            chat_id=chat_id,
            chat_message=ChatMessageCreate(
                message=message_reply,
                role="ai",
            ),
        )

        message_reply_data = ChatMessage(
            chat_id=db_message_reply.chat_id,
            message=db_message_reply.message,
            role=db_message_reply.role,
        )

        await websocket.send_text(message_reply_data.model_dump_json())
