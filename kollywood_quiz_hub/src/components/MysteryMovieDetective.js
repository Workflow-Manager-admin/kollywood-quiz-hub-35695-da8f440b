import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Mystery Movie Detective (Clues based quiz: setting, object, quote/desc)
 * PUBLIC_INTERFACE
 */
function MysteryMovieDetective({ onBackToDashboard }) {
  const QUESTIONS = 10;
  const [movies, setMovies] = useState([]);
  const [step, setStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [showClues, setShowClues] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies().then((data) => {
      setMovies(data.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS));
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  function createClues(movie) {
    let clues = [];
    // Setting: Use city, rural etc if present in overview, else year
    if (movie.overview && (movie.overview.match(/city|village|chennai|police|school|college|revenge|love|thriller/i))) {
      clues.push(
        "Setting: " +
          (movie.overview.match(
            /(city|village|Chennai|police|school|college|revenge|love|thriller)/i
          )?.[0] || "Unknown")
      );
    } else {
      clues.push("Year: " + (movie.release_date ? movie.release_date.slice(0, 4) : "N/A"));
    }
    // Object: Word from plot
    const keywords = movie.overview
      ? movie.overview.match(/\b(car|bus|ring|statue|gun|phone|letter|police|money|revenge|wedding|music|friend)\b/gi)
      : null;
    clues.push(
      "Object: " +
        (keywords ? keywords[0] : "Secret object")
    );
    // Quote: Just a part of plot as "quote"
    if (movie.overview) {
      const q =
        movie.overview.split(".")[0].slice(0, 45) +
        "...";
      clues.push('Quote: "' + q + '"');
    } else {
      clues.push('Quote: "Can you guess the movie?"');
    }
    return clues;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setUserAnswers([
      ...userAnswers,
      {
        guess: input,
        correct: movies[step]?.title,
        wasCorrect: input.trim().toLowerCase() === movies[step]?.title.toLowerCase()
      }
    ]);
    setInput("");
    setReveal(false);
    if (step + 1 === QUESTIONS) setQuizOver(true);
    else setStep(step + 1);
  }

  if (loading) return <div className="container" style={{ paddingTop: 110 }}>Loading...</div>;
  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter((a) => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Mystery Movie Detective"
      />
    );
  if (!movies[step]) return null;

  const clues = createClues(movies[step]);

  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
        Mystery Movie Detective
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Can you crack the case based on 3 cryptic clues?
      </div>
      <div style={{ background: "#eef7f0", borderRadius: 8, padding: 18, marginBottom: 20, color: "#1a017e", fontWeight: 600 }}>
        {clues.map((cl, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            {cl}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Your Guess"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{
            padding: "12px",
            minWidth: 200,
            borderRadius: 4,
            border: "1px solid var(--border-color)",
            marginRight: 8
          }}
        />
        <button className="btn btn-large" type="submit" style={{ color: "#111", background: "#9aefe2" }}>
          Submit
        </button>
      </form>
      <button
        className="btn"
        style={{ background: "#ffeed0", color: "#ca9421" }}
        onClick={() => setReveal(true)}
        disabled={reveal}
      >
        Reveal Answer
      </button>
      {reveal && (
        <div style={{ marginTop: 24, color: "#d7381e", fontSize: 19 }}>
          The answer: <b>{movies[step].title}</b>
        </div>
      )}
    </div>
  );
}

export default MysteryMovieDetective;
