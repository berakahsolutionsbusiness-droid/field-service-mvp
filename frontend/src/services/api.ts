const API = "http://127.0.0.1:8000/api";

export async function login(email: string, senha: string) {
  const res = await fetch(
    `${API}/login?email=${email}&senha=${senha}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error("Login falhou");

  return res.json();
}

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


export async function iniciarOS(osId: number) {
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

  if (!res.ok) throw new Error("Erro ao iniciar OS");

  return res.json();
}

export async function finalizarAtendimento(id: number) {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API}/atendimento/${id}/finalizar`,
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
