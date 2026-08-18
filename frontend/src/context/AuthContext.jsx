import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ loading: true, user: null, permissions: {}, scope: "self" });

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setAuth({ loading: false, user: data.user, permissions: data.permissions, scope: data.scope });
    } catch {
      setAuth({ loading: false, user: null, permissions: {}, scope: "self" });
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) refresh();
    else setAuth({ loading: false, user: null, permissions: {}, scope: "self" });
  }, [refresh]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    setAuth({ loading: false, user: data.user, permissions: data.permissions, scope: data.scope });
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("token");
    setAuth({ loading: false, user: null, permissions: {}, scope: "self" });
  };

  const can = (feature, action) => (auth.permissions?.[feature] || []).includes(action);
  const isAdmin = Object.keys(auth.permissions || {}).some((f) => f !== "laporan")
    || can("laporan", "moderate");

  return (
    <AuthContext.Provider value={{ ...auth, refresh, login, logout, can, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
