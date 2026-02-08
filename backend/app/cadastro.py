from database import SessionLocal
from db.models import Tecnico
from auth import hash_password

db = SessionLocal()

senha_hash = hash_password("7777")

novo = Tecnico(
    nome="Kery1",
    email="kery1@teste.com",
    senha=senha_hash
)

db.add(novo)
db.commit()
db.close()

print("Usuário criado")
