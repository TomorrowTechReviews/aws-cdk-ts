from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from os import getenv
from .schemas import RdsSecret

DB_URL = None
DATABASE_URL = getenv("DATABASE_URL")
RDS_CREDENTIALS = getenv("RDS_CREDENTIALS")

if RDS_CREDENTIALS is not None:
    secret = RdsSecret.model_validate_json(RDS_CREDENTIALS)
    db_host = getenv("RDS_PROXY_HOST", secret.host)
    DB_URL = f"postgresql://{secret.username}:{secret.password}@{db_host}:{secret.port}/{secret.dbname}"
else:
    DB_URL = DATABASE_URL

print("DB_URL: ", DB_URL)
engine = create_engine(DB_URL, pool_size=50, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
