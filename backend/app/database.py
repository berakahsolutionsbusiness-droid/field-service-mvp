# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

from app.db.models import Base

DB_URL = (
    f"postgresql+psycopg2://"
    f"{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}@"
    f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/"
    f"{os.getenv('DB_NAME')}"
)

print(f"Conectando ao banco: {DB_URL.replace(os.getenv('DB_PASS', ''), '****')}")

engine = create_engine(DB_URL, echo=False)

# Cria as tabelas no banco de dados
Base.metadata.create_all(bind=engine)

# Cria a fábrica de sessões
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)