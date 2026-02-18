// api.ts
const API = "http://127.0.0.1:8000/api";

// =====================
// TIPOS (opcional, mas recomendado)
// =====================

export interface OS {
  id: number;
  cliente: string;
  endereco: string;
  status: string;
  tecnico_id?: number;
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
// LISTAR OS
// =====================

export async function getOS(): Promise<OS[]> {
  const res = await fetch(`${API}/os/abertas`, {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
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
// AVANÇAR ETAPA
// =====================

export async function avancarEtapa(
  id: number,
  etapa: string,
  descricao: string = "",
  foto: string = ""
) {
  const res = await fetch(`${API}/atendimento/${id}/etapa`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ 
      etapa, 
      descricao, 
      foto 
    }),
  });

  if (!res.ok) {
    let errorMessage = "Erro ao avançar etapa";
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  return res.json();
}

// =====================
// ATENDIMENTO ATIVO
// =====================

// api.ts - versão corrigida

// =====================
// ATENDIMENTO ATIVO - CORRIGIDO
// =====================

export async function getAtendimentoAtivo(): Promise<Atendimento | null> {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/atendimento/ativo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Se retornar 404, não há atendimento ativo (tratamento mantido por segurança)
    if (res.status === 404) {
      console.log("Nenhum atendimento ativo (404)");
      return null;
    }

    if (!res.ok) {
      console.log("Erro na resposta:", res.status);
      return null; // Retorna null em qualquer erro
    }

    const data = await res.json();
    
    // Se retornou null ou vazio, não há atendimento ativo
    if (!data) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Erro getAtendimentoAtivo:", error);
    return null;
  }
}

// =====================
// HISTÓRICO DE ETAPAS (CORRIGIDO)
// =====================

export async function getEtapas(id: number): Promise<EtapaHistorico[]> {
  try {
    const res = await fetch(`${API}/atendimento/${id}/etapas`, {
      headers: getAuthHeader(),
    });

    if (res.status === 404) {
      return []; // Retorna array vazio se não encontrar
    }

    if (!res.ok) {
      throw new Error("Erro ao buscar histórico de etapas");
    }

    return res.json();
  } catch (error) {
    console.error("Erro em getEtapas:", error);
    return []; // Retorna array vazio em caso de erro
  }
}

// =====================
// HISTÓRICO COMPLETO (mantido para compatibilidade)
// =====================

export async function getHistorico(id?: number): Promise<EtapaHistorico[]> {
  if (id) {
    return getEtapas(id);
  }
  
  // Se não passar ID, busca histórico geral (se existir esse endpoint)
  try {
    const res = await fetch(`${API}/atendimentos/historico`, {
      headers: getAuthHeader(),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error("Erro ao buscar histórico");
    }
    return res.json();
  } catch (error) {
    console.error("Erro em getHistorico:", error);
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
// MEUS ATENDIMENTOS
// =====================

export async function getMeusAtendimentos() {
  try {
    const res = await fetch(`${API}/tecnicos/meus-atendimentos`, {
      headers: getAuthHeader(),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error("Erro ao buscar meus atendimentos");
    }

    return res.json();
  } catch (error) {
    console.error("Erro em getMeusAtendimentos:", error);
    return [];
  }
}

// =====================
// VERIFICAR SE PODE INICIAR ATENDIMENTO
// =====================

export async function verificarPodeIniciarAtendimento(): Promise<boolean> {
  try {
    const atendimentoAtivo = await getAtendimentoAtivo();
    
    // Se não tem atendimento ativo, pode iniciar
    if (!atendimentoAtivo) {
      return true;
    }
    
    // Se tem atendimento ativo, verifica a etapa
    // Só NÃO pode se estiver em EXECUÇÃO
    return atendimentoAtivo.etapa !== "EXECUCAO";
  } catch (error) {
    console.error("Erro ao verificar permissão:", error);
    // Em caso de erro, permite tentar (o backend vai barrar se necessário)
    return true;
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
    console.error("Erro ao verificar atendimento ativo:", error);
    return null;
  }
}

// =====================
// FUNÇÃO PARA SALVAR ETAPA (MANTIDA PARA COMPATIBILIDADE)
// =====================

export async function salvarEtapa(id: number, dados: any) {
  // Adapta os dados para o formato esperado pelo backend
  const payload = {
    etapa: dados.etapa || dados.novaEtapa,
    descricao: dados.descricao || "",
    foto: dados.foto || ""
  };
  
  return avancarEtapa(id, payload.etapa, payload.descricao, payload.foto);
}

// =====================
// LOGOUT
// =====================

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}


// api.ts - função de debug para verificar atendimentos

export async function debugMeusAtendimentos() {
  try {
    const token = localStorage.getItem("token");
    
    const res = await fetch(`${API}/tecnicos/meus-atendimentos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.log("Erro ao buscar meus atendimentos:", res.status);
      return [];
    }

    const data = await res.json();
    console.log("Meus atendimentos:", data);
    return data;
  } catch (error) {
    console.error("Erro no debugMeusAtendimentos:", error);
    return [];
  }
}