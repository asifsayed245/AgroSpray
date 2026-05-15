import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();
  const { signInWithPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signInWithPassword(email, password);
    if (error) setError(error);
    else nav("/");
  };

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white text-xl font-extrabold shadow-pop">
          A
        </div>
        <div>
          <div className="text-lg font-bold text-ink-900">AgroSpray</div>
          <div className="text-xs text-ink-500">Supplier console</div>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-ink-900">Welcome back</h1>
        <p className="text-xs text-ink-500 mt-1">
          Sign in with the email and password your admin set up.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input
            label="Email"
            type="email"
            placeholder="you@yourcompany.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <Button block size="lg" type="submit" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-[11px] text-ink-400">
          <div className="h-px flex-1 bg-ink-900/8" />
          OR
          <div className="h-px flex-1 bg-ink-900/8" />
        </div>

        <Link
          to="/onboarding"
          className="flex items-center justify-center gap-2 rounded-full border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          <Mail className="h-4 w-4" /> Set up a new supplier
        </Link>

        <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
          Your session is encrypted in transit (TLS) and at rest. Data is stored in India.
        </p>
        <p className="mt-2 flex items-start gap-2 text-[11px] text-ink-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
          Trouble? Ask the tenant owner to invite you from Settings → Users.
        </p>
      </Card>
    </div>
  );
}
