import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

// Map some movies to emoji stories (normally would fetch/dynamically generate)
const EMOJI_MAP = [
  { title: "Enthiran", emoji: "🤖❤️🤯🔋⚡️" },
  { title: "3 Idiots", emoji: "🎓👦👦👦😂😭" },
  { title: "Premam", emoji: "👦💏💔🍺🎵" },
  { title: "Kaakha Kaakha", emoji: "👮‍♂️🔫❤️👩🚔" },
  { title: "Baasha", emoji: "👊🚌📞😱🔫" },
  { title: "Vikram Vedha", emoji: "👮‍♂️🤔💣👹🧠" },
  { title: "Super Deluxe", emoji: "🤠🤰🏽😷👩‍👦" },
  { title: "Nayakan", emoji: "👦🥺👊🦁🏢" },
  { title: "I", emoji: "👨🏽🎬🏋️‍♂️💉😱" },
  { title: "Mersal", emoji: "👨‍⚕️👬✨🎩" }
];

/**
 * Emoji Movie Quiz component
 * PUBLIC_INTERFACE
 */
function EmojiMovieQuiz({ onBackToDashboard }) {
  const QUESTIONS = 10;
  const [movies, setMovies] = useState([]);
  const [step, setStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  useEffect(() => {
    // Shuffle from emoji-mapped
    setMovies(() => EMOJI_MAP.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setUserAnswers([
      ...userAnswers,
      {
        guess: input,
        correct: movies[step].title,
        wasCorrect: input.trim().toLowerCase() === movies[step].title.toLowerCase()
      }
    ]);
    setReveal(false);
    setInput("");
    if (step + 1 === QUESTIONS) setQuizOver(true);
    else setStep(step + 1);
  }

  // PUBLIC_INTERFACE
  function handleReveal() {
    setReveal(true);
    setUserAnswers([
      ...userAnswers,
      {
        guess: "",
        correct: movies[step].title,
        wasCorrect: false,
        revealed: true
      }
    ]);
    setTimeout(() => {
      setReveal(false);
      setInput("");
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter((a) => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Emoji Movie Quiz"
      />
    );
  if (!movies[step]) return null;

  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "2.2rem", marginBottom: 13 }}>
        Emoji Movie Quiz
      </h2>
      <div className="description" style={{ marginBottom: 25 }}>
        Guess the Kollywood movie depicted by the emojis!
      </div>
      <div style={{ fontSize: 48, lineHeight: 1.1, marginBottom: 16 }}>{movies[step].emoji}</div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 15 }}>
        <input
          type="text"
          placeholder="Your Guess"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={reveal}
          style={{
            padding: "12px",
            minWidth: 220,
            borderRadius: 4,
            border: "1px solid var(--border-color)",
            marginRight: 8
          }}
        />
        <button type="submit" className="btn btn-large" style={{ color: "#111", background: "#ccffd2" }} disabled={reveal}>
          Submit
        </button>
      </form>
      <button
        className="btn"
        style={{ background: "#faf3c7", color: "#ba8c00" }}
        onClick={handleReveal}
        disabled={reveal}
      >
        Reveal Answer
      </button>
      {reveal && (
        <div style={{ marginTop: 24, color: "#b81363", fontSize: 18 }}>
          The answer: <b>{movies[step].title}</b>
        </div>
      )}
    </div>
  );
}

export default EmojiMovieQuiz;
