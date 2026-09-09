"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(params.get("next") || "/");
        router.refresh();
      } else {
        setError(data.error || "Contraseña incorrecta");
      }
    } catch {
      setError("Error de conexión, probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F5FA" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,.08)",
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <Image src="/pymeton-logo.png" alt="Pymetón" width={220} height={70} style={{ height: 56, width: "auto" }} priority />
        </div>
        <h1 style={{ fontSize: 14, fontWeight: 600, textAlign: "center", margin: 0, color: "#514C6B" }}>
          La Conferencia
        </h1>
        <p style={{ fontSize: 13, color: "#514C6B", textAlign: "center", margin: 0 }}>
          Ingresá la clave del equipo para entrar
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          style={{
            border: "1px solid #DCD3EA",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 14,
          }}
        />
        {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#7764A9",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
