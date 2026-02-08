from db.database import SessionLocal
from db.models import Tecnico
from auth import hash_password

db = SessionLocal()

senha_hash = hash_password("1010")

novo = Tecnico(
    nome="romulo",
    email="romulo10@teste.com",
    senha=senha_hash
)

db.add(novo)
db.commit()
db.close()

print("Usuário criado")
