import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { PortfolioPage } from "./pages/PortfolioPage";
import { PoliticiansListPage } from "./pages/PoliticiansListPage";
import { PoliticianProfilePage } from "./pages/PoliticianProfilePage";
import { PoliticianSimulatePage } from "./pages/PoliticianSimulatePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/politicians" element={<PoliticiansListPage />} />
          <Route path="/politicians/:id" element={<PoliticianProfilePage />} />
          <Route path="/politicians/:id/simulate" element={<PoliticianSimulatePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
