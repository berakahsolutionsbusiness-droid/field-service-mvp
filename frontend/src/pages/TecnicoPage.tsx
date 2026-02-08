import { useEffect, useState } from "react";
import {
  getOS,
  iniciarAtendimentoComGPS,
  getAtendimentoAtivo,
  debugAtendimentoAtivo,
  obterLocalizacao,
  iniciarAtendimento,
} from "../services/api";
import { useNavigate } from "react-router-dom";

export default function TecnicoPage() {
  const [osList, setOS] = useState<any[]>([]);
  const [ativo, setAtivo] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [obtendoGPS, setObtendoGPS] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    try {
      console.log("=== CARREGANDO DADOS ===");
      
      // Debug para verificar o que o backend retorna
      const debugAtivo = await debugAtendimentoAtivo();
      
      // Busca atendimento ativo normal
      const atendimento = await getAtendimentoAtivo();
      console.log("Atendimento ativo:", atendimento);
      setAtivo(atendimento);

      // Busca OS disponíveis
      const data = await getOS();
      console.log("OS disponíveis:", data.length);
      setOS(data);
      
      setErro(""); // Limpa erros anteriores
    } catch (error: any) {
      console.error("Erro ao carregar:", error);
      setErro("Erro ao carregar dados: " + error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function iniciar(id: number) {
    console.log("=== TENTANDO INICIAR OS:", id, "===");
    console.log("Ativo atual no estado:", ativo);
    
    // Se já tem atendimento ativo, redireciona direto
    if (ativo) {
      console.log("Já tem atendimento ativo, redirecionando...");
      navigate(`/atendimento/${ativo.id}`);
      return;
    }
    
    setObtendoGPS(true);
    
    try {
      // Opção 1: Tenta com GPS real
      let latitude = 0;
      let longitude = 0;
      
      try {
        const posicao = await obterLocalizacao();
        latitude = posicao.latitude;
        longitude = posicao.longitude;
        console.log("GPS obtido:", latitude, longitude);
      } catch (gpsError) {
        console.warn("Não foi possível obter GPS:", gpsError);
        // Continua com valores 0,0
      }
      
      // Inicia atendimento
      const resultado = await iniciarAtendimento(id, latitude, longitude);
      console.log("Atendimento iniciado com sucesso:", resultado);
      
      // Recarrega para pegar o novo atendimento ativo
      await carregar();
      
      // Se agora tem atendimento ativo, redireciona
      if (ativo) {
        navigate(`/atendimento/${ativo.id}`);
      } else {
        // Tenta buscar novamente
        const novoAtivo = await getAtendimentoAtivo();
        if (novoAtivo) {
          navigate(`/atendimento/${novoAtivo.id}`);
        } else if (resultado && resultado.atendimento_id) {
          // Usa o ID retornado pela API
          navigate(`/atendimento/${resultado.atendimento_id}`);
        }
      }
      
    } catch (error: any) {
      console.error("=== ERRO DETALHADO ===", error);
      
      // Tratamento específico para erro de atendimento ativo
      if (error.message.includes("já está em atendimento") || 
          error.message.includes("atendimento ativo") ||
          error.message.includes("422")) {
        
        // Força uma verificação EXTRA
        console.log("Fazendo verificação extra de atendimento ativo...");
        const atendimentoExtra = await debugAtendimentoAtivo();
        
        if (atendimentoExtra) {
          setAtivo(atendimentoExtra);
          const nomeCliente = atendimentoExtra.cliente || atendimentoExtra.os?.cliente || "Cliente";
          setErro(`⚠ Você já está atendendo: ${nomeCliente}`);
          
          // Redireciona automaticamente após 2 segundos
          setTimeout(() => {
            navigate(`/atendimento/${atendimentoExtra.id}`);
          }, 2000);
        } else {
          setErro("⚠ " + error.message + " (mas não conseguimos encontrar o atendimento)");
        }
      } else if (error.message.includes("GPS") || error.message.includes("localização")) {
        setErro("⚠ " + error.message + " Tente novamente permitindo a localização.");
      } else {
        setErro("Erro: " + error.message);
      }
    } finally {
      setObtendoGPS(false);
    }
  }

  function irParaAtendimentoAtivo() {
    if (ativo && ativo.id) {
      navigate(`/atendimento/${ativo.id}`);
    }
  }

  function limparErro() {
    setErro("");
  }

  function forcarVerificacao() {
    carregar();
  }

  if (carregando) {
    return (
      <div style={{ 
        padding: 40, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{ 
          fontSize: "48px", 
          marginBottom: "20px",
          animation: "spin 1s linear infinite"
        }}>⏳</div>
        <h3>Carregando dados...</h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* ================= HEADER ================= */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 15
      }}>
        <div>
          <h1 style={{ margin: 0, color: "#2c3e50" }}>Área do Técnico</h1>
          <p style={{ margin: "5px 0 0 0", color: "#7f8c8d" }}>
            Gerencie seus atendimentos
          </p>
        </div>
        
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button 
            onClick={() => navigate("/historico")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>📜</span>
            Histórico
          </button>
          
          <button 
            onClick={forcarVerificacao}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2ecc71",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>🔄</span>
            Atualizar
          </button>
        </div>
      </div>

      <hr style={{ margin: "25px 0", border: "1px solid #ecf0f1" }} />

      {/* ================= MENSAGEM DE ERRO ================= */}
      {erro && (
        <div style={{
          backgroundColor: erro.includes("atendimento ativo") ? "#fef9e7" : "#fddede",
          borderLeft: erro.includes("atendimento ativo") ? "5px solid #f1c40f" : "5px solid #e74c3c",
          padding: "20px",
          marginBottom: "25px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ 
                fontSize: "24px",
                color: erro.includes("atendimento ativo") ? "#f39c12" : "#e74c3c"
              }}>
                {erro.includes("atendimento ativo") ? "⚠️" : "❌"}
              </span>
              <div>
                <strong style={{ 
                  fontSize: "16px",
                  color: erro.includes("atendimento ativo") ? "#d35400" : "#c0392b",
                  display: "block",
                  marginBottom: "5px"
                }}>
                  {erro.includes("atendimento ativo") ? "Atenção" : "Erro"}
                </strong>
                <p style={{ margin: 0, color: "#2c3e50", lineHeight: 1.5 }}>
                  {erro}
                </p>
              </div>
            </div>
            
            <button 
              onClick={limparErro}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#95a5a6",
                padding: "0 5px"
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>
          
          {/* BOTÕES DE AÇÃO BASEADOS NO ERRO */}
          <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
            {erro.includes("atendimento ativo") && ativo ? (
              <>
                <button
                  onClick={() => navigate(`/atendimento/${ativo.id}`)}
                  style={{
                    backgroundColor: "#3498db",
                    color: "white",
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}
                >
                  ▶ Ir para Atendimento
                </button>
                
                <button
                  onClick={carregar}
                  style={{
                    backgroundColor: "#95a5a6",
                    color: "white",
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}
                >
                  ↻ Recarregar
                </button>
              </>
            ) : (
              <button
                onClick={carregar}
                style={{
                  backgroundColor: "#3498db",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px"
                }}
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= ATENDIMENTO ATIVO ================= */}
      {ativo ? (
        <div
          style={{
            border: "2px solid #e67e22",
            padding: "25px",
            marginBottom: "30px",
            backgroundColor: "#fffaf0",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(230, 126, 34, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
            <div style={{
              backgroundColor: "#e67e22",
              color: "white",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px"
            }}>
              🚧
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#d35400", fontSize: "20px" }}>
                ATENDIMENTO EM ANDAMENTO
              </h2>
              <p style={{ margin: "5px 0 0 0", color: "#7f8c8d", fontSize: "14px" }}>
                Finalize este atendimento antes de iniciar outro
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "25px",
            border: "1px solid #fad7a0"
          }}>
            <div style={{ marginBottom: "15px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                marginBottom: "10px" 
              }}>
                <span style={{ color: "#2c3e50" }}>👤</span>
                <span style={{ fontSize: "18px", color: "#2c3e50" }}>
                  <strong>Cliente:</strong> {ativo.cliente || ativo.os?.cliente || "Não identificado"}
                </span>
              </div>
              
              <div style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "10px",
                marginBottom: "10px" 
              }}>
                <span style={{ color: "#2c3e50" }}>📍</span>
                <span style={{ fontSize: "16px", color: "#2c3e50" }}>
                  <strong>Endereço:</strong> {ativo.endereco || ativo.os?.endereco || "Não informado"}
                </span>
              </div>
            </div>
            
            <div style={{ 
              display: "flex", 
              gap: "20px", 
              flexWrap: "wrap",
              fontSize: "14px",
              color: "#7f8c8d",
              paddingTop: "10px",
              borderTop: "1px solid #ecf0f1"
            }}>
              {ativo.os?.id && (
                <span><strong>OS #:</strong> {ativo.os.id}</span>
              )}
              {ativo.id && (
                <span><strong>Atendimento ID:</strong> {ativo.id}</span>
              )}
              {ativo.hora_inicio && (
                <span>
                  <strong>Início:</strong> {new Date(ativo.hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/atendimento/${ativo.id}`)}
              style={{
                backgroundColor: "#2980b9",
                color: "white",
                padding: "14px 28px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                flex: "1",
                minWidth: "200px",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.3s",
                boxShadow: "0 4px 6px rgba(41, 128, 185, 0.2)"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#3498db"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2980b9"}
            >
              <span>▶</span>
              Continuar Atendimento
            </button>
            
            <button
              onClick={() => navigate(`/atendimento/${ativo.id}`)}
              style={{
                backgroundColor: "#27ae60",
                color: "white",
                padding: "14px 28px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                flex: "1",
                minWidth: "200px",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.3s",
                boxShadow: "0 4px 6px rgba(39, 174, 96, 0.2)"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2ecc71"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#27ae60"}
            >
              <span>✅</span>
              Finalizar Atendimento
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          border: "2px dashed #27ae60",
          padding: "25px",
          marginBottom: "30px",
          backgroundColor: "#eafaf1",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "15px" }}>
            <div style={{
              backgroundColor: "#27ae60",
              color: "white",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px"
            }}>
              ✅
            </div>
            <div>
              <h3 style={{ margin: 0, color: "#229954" }}>Pronto para começar!</h3>
              <p style={{ margin: "5px 0 0 0", color: "#27ae60" }}>
                Nenhum atendimento em andamento. Você pode iniciar uma nova OS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= OS ABERTAS ================= */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <h2 style={{ 
            margin: 0, 
            color: "#2c3e50",
            fontSize: "22px"
          }}>
            Ordens de Serviço Disponíveis
          </h2>
          <div style={{
            backgroundColor: "#3498db",
            color: "white",
            padding: "5px 15px",
            borderRadius: "20px",
            fontWeight: "bold",
            fontSize: "14px"
          }}>
            {osList.length} {osList.length === 1 ? "disponível" : "disponíveis"}
          </div>
        </div>
      </div>

      {osList.length === 0 ? (
        <div style={{
          padding: "40px",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          border: "2px dashed #bdc3c7"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "20px", color: "#95a5a6" }}>📭</div>
          <p style={{ fontSize: "18px", color: "#7f8c8d", marginBottom: "10px" }}>
            Nenhuma OS disponível no momento
          </p>
          <p style={{ fontSize: "14px", color: "#95a5a6" }}>
            Volte mais tarde ou entre em contato com o supervisor.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gap: "20px",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))"
        }}>
          {osList.map((os) => (
            <div
              key={os.id}
              style={{
                border: "1px solid #dfe6e9",
                padding: "25px",
                borderRadius: "12px",
                backgroundColor: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease",
                opacity: ativo ? 0.7 : 1,
                position: "relative"
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "15px"
                }}>
                  <div style={{
                    backgroundColor: "#3498db",
                    color: "white",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "16px",
                    flexShrink: 0
                  }}>
                    {os.id}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ 
                      fontSize: "18px", 
                      display: "block",
                      color: "#2c3e50"
                    }}>
                      {os.cliente}
                    </strong>
                    {os.telefone && (
                      <span style={{ 
                        fontSize: "14px", 
                        color: "#7f8c8d",
                        display: "block",
                        marginTop: "3px"
                      }}>
                        📞 {os.telefone}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: "10px",
                  paddingLeft: "52px"
                }}>
                  <span style={{ 
                    color: "#7f8c8d", 
                    marginTop: "2px",
                    flexShrink: 0
                  }}>📍</span>
                  <p style={{ 
                    margin: 0, 
                    color: "#2c3e50",
                    lineHeight: "1.5",
                    fontSize: "15px"
                  }}>
                    {os.endereco}
                  </p>
                </div>
                
                {os.observacao && (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: "10px",
                    marginTop: "10px",
                    paddingLeft: "52px"
                  }}>
                    <span style={{ 
                      color: "#7f8c8d", 
                      marginTop: "2px",
                      flexShrink: 0
                    }}>📝</span>
                    <p style={{ 
                      margin: 0, 
                      color: "#7f8c8d",
                      lineHeight: "1.4",
                      fontSize: "14px",
                      fontStyle: "italic"
                    }}>
                      {os.observacao.length > 100 
                        ? os.observacao.substring(0, 100) + "..." 
                        : os.observacao}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <button 
                  onClick={() => iniciar(os.id)}
                  disabled={!!ativo || obtendoGPS}
                  style={{
                    backgroundColor: ativo || obtendoGPS ? "#bdc3c7" : "#3498db",
                    color: "white",
                    padding: "12px 20px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: ativo || obtendoGPS ? "not-allowed" : "pointer",
                    width: "100%",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                >
                  {obtendoGPS ? (
                    <>
                      <span style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }}></span>
                      Obtendo localização...
                    </>
                  ) : ativo ? (
                    <>
                      <span>⏸️</span>
                      Atendimento em andamento
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      Iniciar Atendimento
                    </>
                  )}
                </button>
                
                {ativo && (
                  <div style={{
                    marginTop: "15px",
                    padding: "10px",
                    backgroundColor: "#fff8dc",
                    borderRadius: "6px",
                    border: "1px solid #f0e68c"
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#b8860b",
                      textAlign: "center",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}>
                      <span>ℹ️</span>
                      Finalize o atendimento atual primeiro
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Nota no final */}
      {osList.length > 0 && (
        <div style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
          textAlign: "center"
        }}>
          <p style={{ margin: 0, color: "#6c757d", fontSize: "14px" }}>
            <strong>Nota:</strong> Para iniciar um atendimento, é necessário permitir o acesso à localização.
            {ativo && " Finalize o atendimento atual para iniciar um novo."}
          </p>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr;
          }
          
          div[style*="flex-wrap"] {
            flex-direction: column;
            align-items: stretch;
          }
          
          button[style*="minWidth"] {
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}