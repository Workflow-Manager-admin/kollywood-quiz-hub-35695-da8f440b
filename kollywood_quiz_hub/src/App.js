import React, { useState } from "react";
import "./App.css";

// Component imports
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import BlurredPosterQuiz from "./components/BlurredPosterQuiz";
import CharacterMovieMatch from "./components/CharacterMovieMatch";
import MysteryMovieDetective from "./components/MysteryMovieDetective";
import MovieBingo from "./components/MovieBingo";
import MovieSpinChallenge from "./components/MovieSpinChallenge";
// import EmojiMovieQuiz from "./components/EmojiMovieQuiz";  // Removed (replaced)

function App() {
  // App navigation state
  const [username, setUsername] = useState(null);
  const [screen, setScreen] = useState("login"); // login, dashboard, game keys...

  // Handle login
  function handleLogin(name) {
    setUsername(name);
    setScreen("dashboard");
  }

  function handleGameSelect(gameKey) {
    setScreen(gameKey);
  }

  function handleBackToDashboard() {
    setScreen("dashboard");
  }

  // Navigation mapping (gameKey -> component)
  const GAME_COMPONENTS = {
    blurredPoster: <BlurredPosterQuiz onBackToDashboard={handleBackToDashboard} />,
    characterMatch: <CharacterMovieMatch onBackToDashboard={handleBackToDashboard} />,
    mysteryDetective: <MysteryMovieDetective onBackToDashboard={handleBackToDashboard} />,
    movieBingo: <MovieBingo onBackToDashboard={handleBackToDashboard} />,
    movieSpin: <MovieSpinChallenge onBackToDashboard={handleBackToDashboard} />,
    // "emojiQuiz" gameKey is deprecated
  };

  return (
    <div className="app">
      {/* NavBar */}
      <nav className="navbar">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div className="logo">
              <span className="logo-symbol">🎬</span> Kollywood Quiz Hub
            </div>
            <div>
              {username &&
                <span style={{ color: "var(--base-light)", fontWeight: 500, fontSize: 16 }}>
                  {username}
                </span>
              }
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* LOGIN */}
        {screen === "login" && <Login onLogin={handleLogin} />}

        {/* DASHBOARD */}
        {screen === "dashboard" && <Dashboard username={username} onGameSelect={handleGameSelect} />}

        {/* GAME SCREENS */}
        {Object.keys(GAME_COMPONENTS).map(
          (key) => screen === key ? <React.Fragment key={key}>{GAME_COMPONENTS[key]}</React.Fragment> : null
        )}
      </main>
    </div>
  );
}

export default App;