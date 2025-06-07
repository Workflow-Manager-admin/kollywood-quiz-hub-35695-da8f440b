import React, { useState } from "react";

/**
 * Login Component
 * Prompts the user for a username to simulate login.
 * PUBLIC_INTERFACE
 */
function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  // PUBLIC_INTERFACE
  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username to continue.");
      return;
    }
    setError("");
    onLogin(username.trim());
  }

  return (
    <div className="login-screen hero">
      <h1 className="title" style={{ marginBottom: "24px" }}>
        Kollywood Quiz Hub
      </h1>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320 }}>
        <label htmlFor="username" style={{ fontWeight: 500, fontSize: 18, color: "var(--base-light)" }}>
          Enter your name:
        </label>
        <input
          id="username"
          type="text"
          placeholder="Your Name"
          value={username}
          autoFocus
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            margin: "16px 0 6px 0",
            padding: "12px",
            borderRadius: 4,
            border: "1px solid var(--border-color)",
            fontSize: "1.1rem",
            background: "#fff",
            color: "#222",
            outline: "none"
          }}
        />
        {error && (
          <div style={{ color: "#e53b3b", fontWeight: 500, marginBottom: 8 }}>{error}</div>
        )}
        <button
          type="submit"
          className="btn btn-large"
          style={{
            width: "100%",
            background: "var(--base-light)",
            color: "#111",
            marginTop: "8px"
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
