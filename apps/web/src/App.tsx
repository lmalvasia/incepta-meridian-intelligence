import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/shell/AppShell";
import { AccountPage } from "./pages/AccountPage";
import { AccountsPage } from "./pages/AccountsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { QualityPage } from "./pages/QualityPage";
import { RevenuePage } from "./pages/RevenuePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/:sourceId" element={<AccountPage />} />
          <Route path="data-quality" element={<QualityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
