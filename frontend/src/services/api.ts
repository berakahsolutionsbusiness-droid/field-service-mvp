const API = "http://127.0.0.1:8000/api";

// =====================
// AUTH HEADER
// =====================

function getAuthHeader() {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// =====================
// LOGIN
// =====================

export async function login(email: string, senha: string) {
  const res = await fetch(
    `${API}/login?email=${email}&senha=${senha}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Login falhou");

  return res.json();
}

// =====================
// LISTAR OS
// =====================

export async function getOS() {
  const res = await fetch(`${API}/os/abertas`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) throw new Error("Erro ao buscar OS");

  return res.json();
}

// =====================
// INICIAR ATENDIMENTO
// =====================

export async function iniciarAtendimento(osId: number) {
  const res = await fetch(`${API}/os/${osId}/iniciar`, {
    method: "POST",
    headers: getAuthHeader(),
  });

  if (!res.ok) throw new Error("Erro ao iniciar atendimento");

  return res.json();
}

// =====================
// FINALIZAR ATENDIMENTO
// =====================

export async function finalizarAtendimento(
  id: number,
  dados: {
    observacao: string;
    latitude: number;
    longitude: number;
    foto: string;
  }
) {
  const res = await fetch(`${API}/atendimento/${id}/finalizar`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });

  if (!res.ok) throw new Error("Erro ao finalizar atendimento");

  return res.json();
}

// =====================
// HISTÓRICO
// =====================

export async function getHistorico() {
  const res = await fetch(`${API}/atendimentos/historico`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) throw new Error("Erro ao buscar histórico");

  return res.json();
}
