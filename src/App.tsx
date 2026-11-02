import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './auth/AuthContext'
import { Guard } from './auth/Guard'
import { SplashScreen } from './components/SplashScreen'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { MfaSetupPage } from './pages/MfaSetupPage'
import { MfaVerifyPage } from './pages/MfaVerifyPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { AccountsPage } from './pages/AccountsPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { GoalsPage } from './pages/GoalsPage'
import { MorePage } from './pages/MorePage'
import { CategoriesPage } from './pages/CategoriesPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { DebtsPage } from './pages/DebtsPage'
import { DebtDetailPage } from './pages/DebtDetailPage'
import { SalarioPage } from './pages/SalarioPage'
import { AtajosPage } from './pages/AtajosPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { PlanPage } from './pages/PlanPage'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setShowSplash(true)
        const t = setTimeout(() => setShowSplash(false), 1500)
        return () => clearTimeout(t)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <>
      {showSplash && <SplashScreen />}
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Guard allow="signed_out"><LoginPage /></Guard>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mfa/setup" element={<Guard allow="mfa_enroll"><MfaSetupPage /></Guard>} />
          <Route path="/mfa/verify" element={<Guard allow="mfa_verify"><MfaVerifyPage /></Guard>} />
          <Route path="/" element={<Guard allow="ready"><AppShell /></Guard>}>
            <Route index element={<DashboardPage />} />
            <Route path="movimientos" element={<TransactionsPage />} />
            <Route path="cuentas" element={<AccountsPage />} />
            <Route path="presupuestos" element={<BudgetsPage />} />
            <Route path="metas" element={<GoalsPage />} />
            <Route path="mas" element={<MorePage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="plantilla" element={<PlanPage />} />
            <Route path="simulador" element={<SimulatorPage />} />
            <Route path="salario" element={<SalarioPage />} />
            <Route path="deudas" element={<DebtsPage />} />
            <Route path="deudas/:id" element={<DebtDetailPage />} />
            <Route path="atajos" element={<AtajosPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </>
  )
}
