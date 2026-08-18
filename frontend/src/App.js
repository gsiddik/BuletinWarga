import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import PublicHome from "@/pages/PublicHome";
import Login from "@/pages/Login";
import AdminLayout from "@/admin/AdminLayout";
import DashboardPage from "@/admin/DashboardPage";
import RWPage from "@/admin/RWPage";
import RTPage from "@/admin/RTPage";
import WargaPage from "@/admin/WargaPage";
import PengurusPage from "@/admin/PengurusPage";
import KategoriPage from "@/admin/KategoriPage";
import RolePage from "@/admin/RolePage";
import LaporanPage from "@/admin/LaporanPage";

function AdminGate({ children }) {
  const { loading, user, isAdmin } = useAuth();
  if (loading) return <div className="p-10 text-muted-foreground">Memuat…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <AdminGate>
                  <AdminLayout />
                </AdminGate>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="rw" element={<RWPage />} />
              <Route path="rt" element={<RTPage />} />
              <Route path="warga" element={<WargaPage />} />
              <Route path="pengurus" element={<PengurusPage />} />
              <Route path="kategori" element={<KategoriPage />} />
              <Route path="role" element={<RolePage />} />
              <Route path="laporan" element={<LaporanPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
