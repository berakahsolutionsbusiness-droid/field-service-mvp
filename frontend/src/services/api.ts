// api.ts
const API = "http://127.0.0.1:8000/api";

// =====================
// INTERFACES
// =====================

export interface OS {
  id: number;
  cliente: string;
  endereco: string;
  status: string;
  tecnico_id?: number;
  observacao?: string;
  telefone?: string;
}

export interface Atendimento {
  id: number;
  etapa: string;
  os: {
    id: number;
    cliente: string;
    endereco: string;
    status: string;
  };
}

export interface EtapaHistorico {
  id: number;
  etapa: string;
  descricao: string;
  foto: string;
  criado_em: string;
}

export interface AtendimentoHistorico {
  id: number;
  os_id: number;
  cliente: string;
  endereco: string;
  etapa_atual: string;
  hora_inicio: string;
  hora_fim: string | null;
  status: string;
  etapas: EtapaHistorico[];
}

export interface LoginResponse {
  token: string;
}

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

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const res = await fetch(
    `${API}/login?email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login falhou" }));
    throw new Error(error.detail || "Login falhou");
  }

  return res.json();
}

// =====================
// LOGOUT
// =====================

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

// =====================
// LISTAR OS
// =====================

export async function getOS(): Promise<OS[]> {
  const res = await fetch(`${API}/os/abertas`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      logout();
      throw new Error("Sessão expirada");
    }
    throw new Error("Erro ao buscar OS");
  }

  return res.json();
}

// =====================
// INICIAR ATENDIMENTO
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
    let errorMessage = "Erro ao iniciar atendimento";
    
    try {
      const errorData = await res.json();
      console.log("Backend error response:", errorData);
      
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      console.log("Could not parse error response:", e);
    }
    
    if (res.status === 422) {
      errorMessage = "Não é possível iniciar atendimento. Você já tem um atendimento em EXECUÇÃO.";
    } else if (res.status === 400) {
      errorMessage = errorMessage || "Erro na requisição. Verifique os dados.";
    }
    
    throw new Error(errorMessage);
  }

  return res.json();
}

// =====================
// INICIAR ATENDIMENTO COM GPS
// =====================

export async function iniciarAtendimentoComGPS(osId: number) {
  try {
    const posicao = await obterLocalizacao();
    console.log("Localização obtida:", posicao);
    return await iniciarAtendimento(osId, posicao.latitude, posicao.longitude);
  } catch (gpsError) {
    console.warn("Não foi possível obter GPS, usando valores padrão:", gpsError);
    return await iniciarAtendimento(osId, 0, 0);
  }
}

// =====================
// AVANÇAR ETAPA
// =====================

export async function avancarEtapa(
  id: number,
  etapa: string,
  descricao: string = "",
  foto: string = ""
) {
  console.log(`📤 Enviando requisição para /atendimento/${id}/etapa`, { etapa, descricao });
  
  const res = await fetch(`${API}/atendimento/${id}/etapa`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ etapa, descricao, foto }),
  });

  if (!res.ok) {
    let errorMessage = "Erro ao avançar etapa";
    try {
      const errorData = await res.json();
      console.error("Erro detalhado:", errorData);
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  return res.json();
}

// =====================
// ATENDIMENTO ATIVO
// =====================

export async function getAtendimentoAtivo(): Promise<Atendimento | null> {
  try {
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: getAuthHeader(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data;
    
  } catch (error) {
    console.error("Erro getAtendimentoAtivo:", error);
    return null;
  }
}

// =====================
// HISTÓRICO COMPLETO (CORRIGIDO)
// =====================

export async function getHistorico(): Promise<AtendimentoHistorico[]> {
  try {
    const res = await fetch(`${API}/atendimentos/historico`, {
      headers: getAuthHeader(),
    });

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      throw new Error(`Erro ao buscar histórico: ${res.status}`);
    }

    const data = await res.json();
    console.log("📦 Histórico recebido:", data);
    
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error("❌ Erro em getHistorico:", error);
    return [];
  }
}

// =====================
// ETAPAS DE UM ATENDIMENTO
// =====================

export async function getEtapas(id: number): Promise<EtapaHistorico[]> {
  try {
    const res = await fetch(`${API}/atendimento/${id}/etapas`, {
      headers: getAuthHeader(),
    });

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      throw new Error("Erro ao buscar histórico de etapas");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error("Erro em getEtapas:", error);
    return [];
  }
}

// =====================
// MEUS ATENDIMENTOS
// =====================

export async function getMeusAtendimentos(): Promise<any[]> {
  try {
    const res = await fetch(`${API}/tecnicos/meus-atendimentos`, {
      headers: getAuthHeader(),
    });

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      throw new Error("Erro ao buscar meus atendimentos");
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error("Erro em getMeusAtendimentos:", error);
    return [];
  }
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

  if (!res.ok) {
    let errorMessage = "Erro ao finalizar atendimento";
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  return res.json();
}

// =====================
// OBTER LOCALIZAÇÃO
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
// VERIFICAR SE PODE INICIAR ATENDIMENTO
// =====================

export async function verificarPodeIniciarAtendimento(): Promise<boolean> {
  try {
    const atendimentoAtivo = await getAtendimentoAtivo();
    
    if (!atendimentoAtivo) {
      return true;
    }
    
    return atendimentoAtivo.etapa !== "EXECUCAO";
    
  } catch (error) {
    console.error("Erro ao verificar permissão:", error);
    return true;
  }
}

// =====================
// DEBUG FUNCTIONS
// =====================

export async function debugAtendimentoAtivo() {
  try {
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: getAuthHeader(),
    });
    
    console.log("Status do /ativo:", res.status);
    
    if (res.status === 404) {
      console.log("Nenhum atendimento ativo encontrado");
      return null;
    }
    
    if (!res.ok) {
      const text = await res.text();
      console.log("Resposta de erro:", text);
      return null;
    }
    
    const data = await res.json();
    console.log("Atendimento ativo encontrado:", data);
    return data;
    
  } catch (error) {
    console.error("Erro no debugAtendimentoAtivo:", error);
    return null;
  }
}

// =====================
// SALVAR ETAPA (COMPATIBILIDADE)
// =====================

export async function salvarEtapa(id: number, dados: any) {
  const payload = {
    etapa: dados.etapa || dados.novaEtapa,
    descricao: dados.descricao || "",
    foto: dados.foto || ""
  };
  
  return avancarEtapa(id, payload.etapa, payload.descricao, payload.foto);
}