"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Access denied");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Secure Access</p>
        <h1>Claw Vault</h1>
        <p className="login-copy">
          Enter your security key to access the document library.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="search-input-wrapper">
            <input
              type="password"
              className="search-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Security Key..."
              autoFocus
              required
              style={{ paddingLeft: "1.5rem" }} 
            />
          </div>
          
          {error && <p className="login-error">{error}</p>}
          
          <button 
            type="submit" 
            className="viewer-back" 
            disabled={isLoading}
            style={{ width: "100%", justifyContent: "center", marginTop: "1.5rem" }}
          >
            {isLoading ? "Unlocking Vault..." : "Unlock Access"}
          </button>
        </form>
      </div>
    </main>
  );
}
