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
// INICIAR ATENDIMENTO (COM GPS)
// =====================

export async function iniciarAtendimento(
  osId: number, 
  latitude: number = 0, 
  longitude: number = 0
) {
  const res = await fetch(`${API}/os/${osId}/iniciar`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({
      latitude: latitude,
      longitude: longitude
    }),
  });

  if (!res.ok) {
    // Tenta obter a mensagem de erro do backend
    let errorMessage = "Erro ao iniciar atendimento";
    
    try {
      const errorData = await res.json();
      console.log("Backend error response:", errorData);
      
      if (errorData.detail) {
        // FastAPI geralmente retorna erro em 'detail'
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Se não conseguir parsear JSON, usa o status
      console.log("Could not parse error response:", e);
    }
    
    if (res.status === 422) {
      errorMessage = "Não é possível iniciar atendimento. Você já tem um atendimento ativo.";
    } else if (res.status === 400) {
      errorMessage = errorMessage || "Erro na requisição. Verifique os dados.";
    }
    
    throw new Error(errorMessage);
  }

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

// =====================
// ATENDIMENTO ATIVO (com melhor tratamento de erro)
// =====================

export async function getAtendimentoAtivo() {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Se retornar 404, não há atendimento ativo
    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      // Se for outro erro, verifica se é "sem atendimento ativo"
      const errorData = await res.json().catch(() => ({}));
      if (errorData.message?.includes("Não há atendimento ativo")) {
        return null;
      }
      throw new Error("Erro ao buscar atendimento ativo");
    }

    return res.json();
  } catch (error) {
    console.error("Erro getAtendimentoAtivo:", error);
    // Retorna null em caso de erro para não quebrar a interface
    return null;
  }
}

// =====================
// FUNÇÃO PARA OBTER LOCALIZAÇÃO
// =====================

export function obterLocalizacao(): Promise<{latitude: number, longitude: number}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada pelo navegador"));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let mensagem = "Erro ao obter localização: ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            mensagem += "Permissão negada. Ative a localização.";
            break;
          case error.POSITION_UNAVAILABLE:
            mensagem += "Localização indisponível.";
            break;
          case error.TIMEOUT:
            mensagem += "Tempo esgotado para obter localização.";
            break;
          default:
            mensagem += "Erro desconhecido.";
        }
        reject(new Error(mensagem));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// =====================
// FUNÇÃO PARA INICIAR COM GPS
// =====================

export async function iniciarAtendimentoComGPS(osId: number) {
  try {
    // Tenta obter localização real
    const posicao = await obterLocalizacao();
    console.log("Localização obtida:", posicao);
    
    // Inicia atendimento com GPS real
    return await iniciarAtendimento(osId, posicao.latitude, posicao.longitude);
  } catch (gpsError) {
    console.warn("Não foi possível obter GPS, usando valores padrão:", gpsError);
    
    // Se falhar o GPS, usa valores padrão (0,0)
    return await iniciarAtendimento(osId, 0, 0);
  }
}

// =====================
// DEBUG FUNCTIONS
// =====================

export async function debugAtendimentoAtivo() {
  try {
    const token = localStorage.getItem("token");
    console.log("Token atual:", token?.substring(0, 20) + "...");
    
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log("Status do /ativo:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    
    if (res.status === 404) {
      console.log("Nenhum atendimento ativo encontrado (404)");
      return null;
    }
    
    if (!res.ok) {
      const text = await res.text();
      console.log("Resposta de erro:", text);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    
    const data = await res.json();
    console.log("Atendimento ativo encontrado:", data);
    return data;
  } catch (error) {
    console.error("Erro no debugAtendimentoAtivo:", error);
    return null;
  }
}

export async function verificarAtendimentoAtivo() {
  try {
    const token = localStorage.getItem("token");
    
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) {
      return null; // Nenhum atendimento ativo
    }

    if (!res.ok) throw new Error("Erro ao verificar atendimento ativo");

    return res.json();
  } catch (error) {
    // Se for erro 404 ou similar, retorna null
    return null;
  }
}