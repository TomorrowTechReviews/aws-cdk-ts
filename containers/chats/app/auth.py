from typing import Annotated
from fastapi import Header, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import PyJWKClient
from os import environ
from .schemas import AuthUser

AWS_USER_POOL_ID = environ.get("AWS_USER_POOL_ID")
AWS_USER_POOL_CLIENT_ID = environ.get("AWS_USER_POOL_CLIENT_ID")
AWS_REGION = environ.get("AWS_REGION")

JWT_ALGORITHM = "RS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def decode_jwt(token: str):
    jwks_uri = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{AWS_USER_POOL_ID}/.well-known/jwks.json"
    jwk_client = PyJWKClient(uri=jwks_uri)
    signing_key = jwk_client.get_signing_key_from_jwt(token)

    try:
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=[JWT_ALGORITHM],
            audience=AWS_USER_POOL_CLIENT_ID,
        )
        return decoded_token
    except jwt.PyJWTError as e:
        return None


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    decoded_token = await decode_jwt(token)
    if decoded_token is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    return AuthUser(id=decoded_token["sub"])


async def get_current_user_ws(token: str):
    decoded_token = await decode_jwt(token)
    if decoded_token is None:
        return None

    return AuthUser(id=decoded_token["sub"])
