import React from "react";

/**
 * Dashboard Component
 * Shows all quiz games for selection.
 * PUBLIC_INTERFACE
 */
function Dashboard({ username, onGameSelect }) {
  const games = [
    {
      key: "blurredPoster",
      title: "Blurred Poster Quiz",
      desc: "Guess the Kollywood movie from a blurred poster.",
      icon: "🖼️"
    },
    {
      key: "characterMatch",
      title: "Character-Movie Match",
      desc: "Match Kollywood characters to their films.",
      icon: "🧑‍🤝‍🧑"
    },
    {
      key: "mysteryDetective",
      title: "Mystery Movie Detective",
      desc: "Identify the movie based on cryptic clues.",
      icon: "🕵️"
    },
    {
      key: "movieBingo",
      title: "Movie Bingo",
      desc: "Find Kollywood movies matching fun categories.",
      icon: "🎲"
    },
    {
      key: "movieSpin",
      title: "Movie Spin Challenge",
      desc: "Spin the actor, genre, and location wheels. Guess a movie that matches all three!",
      icon: "🎰"
    }
  ];

  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <div className="subtitle">Hi, {username}!</div>
      <h1 className="title" style={{ fontSize: "2.2rem" }}>
        Choose Your Quiz Game
      </h1>
      <div className="description">
        Select any game mode below to start your Kollywood movie quiz adventure.
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          marginTop: 30,
          justifyContent: "center"
        }}
      >
        {games.map((g) => (
          <div
            key={g.key}
            className="quiz-card"
            style={{
              minWidth: 220,
              borderRadius: 10,
              background: "#fff",
              color: "#111",
              boxShadow: "0 0 12px rgba(0,0,0,.06)",
              padding: "28px 18px",
              cursor: "pointer",
              transition: "transform .14s",
              flex: "1 1 250px",
              maxWidth: 260
            }}
            onClick={() => onGameSelect(g.key)}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onGameSelect(g.key)}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>{g.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 19 }}>{g.title}</div>
            <div style={{ fontSize: 14, color: "#666", marginTop: 10 }}>{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
