const API = "http://127.0.0.1:8000/api";

//
// LOGIN
//
export async function login(email: string, senha: string) {
  const res = await fetch(
    `${API}/login?email=${email}&senha=${senha}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Login falhou");

  return res.json();
}

//
// LISTAR OS
//
export async function getOS() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/os/abertas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Erro ao buscar OS");

  return res.json();
}

//
// INICIAR ATENDIMENTO
//
export async function iniciarAtendimento(osId: number) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API}/os/${osId}/iniciar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Falha ao iniciar");

  return res.json();
}


//
// FINALIZAR ATENDIMENTO
//
export async function finalizarAtendimento(atendimentoId: number) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API}/atendimento/${atendimentoId}/finalizar`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Erro ao finalizar");

  return res.json();
}

export async function getHistorico() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/atendimentos/historico`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Erro ao buscar histórico");

  return res.json();
}
