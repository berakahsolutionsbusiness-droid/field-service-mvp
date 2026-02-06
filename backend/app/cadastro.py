from database import SessionLocal
from db.models import Tecnico
from auth import hash_password

db = SessionLocal()

senha_hash = hash_password("1234")

novo = Tecnico(
    nome="Romulo3",
    email="romulo3@teste.com",
    senha=senha_hash
)

db.add(novo)
db.commit()
db.close()

print("Usuário criado")
