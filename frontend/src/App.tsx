import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TecnicoPage from "./pages/TecnicoPage";
import AtendimentoPage from "./pages/AtendimentoPage";


function LoginWrapper() {
  const navigate = useNavigate();

  return (
    <LoginPage
      onLogin={() => navigate("/tecnico")}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route path="/tecnico" element={<TecnicoPage />} />
        <Route path="/atendimento/:id" element={<AtendimentoPage />} />

      </Routes>
    </BrowserRouter>
  );
}

