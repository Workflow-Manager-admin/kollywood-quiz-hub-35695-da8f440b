import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * BlurredPosterQuiz component
 * 10 rounds: shows blurred poster, clues, answer, reveal, next.
 * PUBLIC_INTERFACE
 */
function BlurredPosterQuiz({ onBackToDashboard }) {
  const QUESTIONS = 10;
  const [movies, setMovies] = useState([]);
  const [step, setStep] = useState(0); // current question index
  const [userAnswers, setUserAnswers] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [showClue, setShowClue] = useState(false);
  const [showSecondClue, setShowSecondClue] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then((all) => {
        // Shuffle array, pick 10 unique
        const shuffled = all.sort(() => 0.5 - Math.random());
        setMovies(shuffled.slice(0, QUESTIONS));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getClues(movie, which = 1) {
    if (!movie) return "—";
    if (which === 1) {
      return movie.release_date
        ? `Release Year: ${movie.release_date.slice(0, 4)}`
        : "No release date clue";
    }
    return movie.overview
      ? "Plot: " + movie.overview.split(" ").slice(0, 7).join(" ") + "..."
      : "No plot clue";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!inputValue.trim() && !reveal) return;
    setUserAnswers([
      ...userAnswers,
      {
        guess: inputValue,
        correct: movies[step].title,
        wasCorrect:
          inputValue.trim().toLowerCase() === movies[step].title.toLowerCase()
      }
    ]);
    setReveal(false);
    setShowClue(false);
    setShowSecondClue(false);
    setInputValue("");
    if (step + 1 === QUESTIONS) setQuizOver(true);
    else setStep(step + 1);
  }

  function handleReveal() {
    setReveal(true);
  }

  if (loading)
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <div>Loading quiz questions...</div>
      </div>
    );
  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter((a) => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Blurred Poster Quiz"
      />
    );
  if (!movies[step]) return null;

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 24 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "2rem", marginBottom: 18 }}>
        Blurred Poster Quiz
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Guess the movie from the blurred poster! Get up to 2 clues and reveal the answer if stuck.
      </div>
      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <div
          style={{
            filter: "blur(7px) brightness(0.77)",
            borderRadius: "12px",
            overflow: "hidden",
            width: 180,
            height: 260,
            background: "#ccc",
            margin: "auto"
          }}
        >
          {movies[step].poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w342${movies[step].poster_path}`}
              alt="Blurred Poster"
              width="180"
              height="260"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 180, height: 260, background: "#aaa" }} />
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
        <input
          type="text"
          placeholder="Your Guess"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={reveal}
          style={{
            padding: "12px",
            minWidth: 220,
            maxWidth: 350,
            fontSize: "1rem",
            borderRadius: 4,
            border: "1px solid var(--border-color)",
            marginBottom: 8,
            marginRight: 8,
            background: reveal ? "#eee" : "#fff",
            color: "#333"
          }}
        />
        {!reveal && (
          <button type="submit" className="btn btn-large">
            Submit
          </button>
        )}
      </form>
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="btn"
          style={{ marginRight: 8, backgroundColor: "#40e1e1", color: "#113" }}
          onClick={() => setShowClue(true)}
          disabled={showClue}
        >
          {showClue ? "Clue 1 Shown" : "Show Clue 1"}
        </button>
        {showClue && (
          <>
            <button
              type="button"
              className="btn"
              style={{
                marginRight: 8,
                backgroundColor: "#7ec2fa",
                color: "#111"
              }}
              onClick={() => setShowSecondClue(true)}
              disabled={showSecondClue}
            >
              {showSecondClue ? "Clue 2 Shown" : "Show Clue 2"}
            </button>
          </>
        )}
        <button
          type="button"
          className="btn"
          style={{
            background: "#efb307", color: "#211", marginLeft: 5
          }}
          onClick={handleReveal}
          disabled={reveal}
        >
          Reveal Answer
        </button>
      </div>
      <div>
        {showClue && (
          <div className="description" style={{ margin: "8px 0 0 0", color: "#00b5ad" }}>
            <strong>Clue 1:</strong> {getClues(movies[step], 1)}
          </div>
        )}
        {showSecondClue && (
          <div className="description" style={{ margin: "8px 0 0 0", color: "#ea137a" }}>
            <strong>Clue 2:</strong> {getClues(movies[step], 2)}
          </div>
        )}
        {reveal && (
          <div style={{ marginTop: 16, fontWeight: 600, color: "#bf4d2d" }}>
            The movie was: {movies[step].title}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlurredPosterQuiz;
