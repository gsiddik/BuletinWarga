import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errMsg(e) {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return e?.message || "Terjadi kesalahan";
}

export function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, mime: file.type, data: String(reader.result) });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const STATUS_STYLE = {
  baru: "bg-amber-100 text-amber-800",
  dibaca: "bg-blue-100 text-blue-800",
  selesai: "bg-emerald-100 text-emerald-800",
};

export const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};
