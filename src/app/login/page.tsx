"use client";
import { useState } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!token.trim()) {
      setError("Token required");
      return;
    }
    document.cookie = `studio_access=${token.trim()}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.href = "/";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <h1>Claw3D Studio</h1>
      <input
        type="password"
        placeholder="Enter access token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={{ padding: 8, width: 300, fontSize: 16 }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleLogin} style={{ padding: "8px 24px", fontSize: 16 }}>
        Enter
      </button>
    </div>
  );
}