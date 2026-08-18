import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      toast.success("Berhasil masuk");
      navigate("/");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1651514645933-c26e0eb4ace3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxjb21tdW5pdHklMjBtZWV0aW5nJTIwbmVpZ2hib3Job29kfGVufDB8fHx8MTc4NzA2NzQwNXww&ixlib=rb-4.1.0&q=85"
          alt="Warga bermusyawarah"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/55" />
        <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Buletin Warga</p>
          <h1 className="mt-4 font-head text-4xl font-extrabold leading-tight sm:text-5xl">
            Suara warga,<br /> gerak pengurus.
          </h1>
          <p className="mt-5 max-w-md text-white/85">
            Kirim pengaduan dan aspirasi ke RT/RW Anda, pantau tindak lanjutnya secara terbuka.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            data-testid="login-back-link"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Buletin
          </Link>
          <h2 className="font-head text-2xl font-extrabold tracking-tight sm:text-3xl">Masuk</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan email atau nomor telepon yang terdaftar.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username">Email atau Nomor Telepon</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nama@email.com / 0812xxxx"
                className="bg-muted/60"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/60"
                required
              />
            </div>
            {error && (
              <p data-testid="login-error" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={busy}
              className="w-full rounded-full transition-colors"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Masuk
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
