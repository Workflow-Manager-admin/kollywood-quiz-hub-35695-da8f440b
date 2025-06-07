import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Character-Movie Match Component
 * PUBLIC_INTERFACE
 */
function CharacterMovieMatch({ onBackToDashboard }) {
  const QUESTIONS = 10;
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState("");
  const [draggedChar, setDraggedChar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  // Fix: make sure hooks are always called unconditionally, at the top:
  const [reveal, setReveal] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  // Sample characters. In real app, would fetch credits+characters from TMDB, here is stub:
  const CHARACTERS = [
    { name: "Vikram", movies: ["Anniyan", "I"] },
    { name: "Chitti", movies: ["Enthiran", "2.0"] },
    { name: "Saroja Devi", movies: ["Thillana Mohanambal"] },
    { name: "Arjun", movies: ["Gentleman"] },
    { name: "Nallasivam", movies: ["Anbe Sivam"] },
    { name: "Anbuchelvan IPS", movies: ["Kaakha Kaakha"] },
    { name: "Subramani", movies: ["Mouna Ragam"] },
    { name: "Rangasamy", movies: ["Sivaji"] },
    { name: "Dhanush", movies: ["VIP", "Maari"] },
    { name: "Velu Naicker", movies: ["Nayakan"] },
  ];

  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then((all) => {
        // Pick 10 random, associate with a char
        const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS);
        const qs = shuffled.map((movie, i) => {
          const chars =
            CHARACTERS.find((c) => c.movies.includes(movie.title))?.name ||
            CHARACTERS[i % CHARACTERS.length].name;
          return {
            character: chars,
            movie: movie.title,
            movieObj: movie,
          };
        });
        setQuestions(qs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleDrop(movie, e) {
    e.preventDefault();
    setSelectedMovie(movie);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setUserAnswers([
      ...userAnswers,
      {
        guessedMovie: selectedMovie,
        actualMovie: questions[step].movie,
        wasCorrect:
          selectedMovie === questions[step].movie,
        character: questions[step].character,
      }
    ]);
    setSelectedMovie("");
    if (step + 1 === QUESTIONS) setQuizOver(true);
    else setStep(step + 1);
  }

  if (loading) return <div className="container" style={{ paddingTop: 120 }}>Loading...</div>;
  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter((a) => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Character-Movie Match"
      />
    );
  if (!questions[step]) return null;

  // (Hooks for reveal state are already correctly declared at the top)

  function handleReveal() {
    setReveal(true);
    setUserAnswers([
      ...userAnswers,
      {
        guessedMovie: "",
        actualMovie: questions[step].movie,
        wasCorrect: false,
        character: questions[step].character,
        revealed: true
      }
    ]);
    setJustRevealed(true);
    setTimeout(() => {
      setReveal(false);
      setSelectedMovie("");
      setJustRevealed(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

    // (removed duplicate hook declarations; hooks are already at the top unconditionally)

  // Drag-and-drop placeholders
  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "1.6rem", marginBottom: 13 }}>
        Character-Movie Match
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Drag the character to the correct Kollywood movie.
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          background: "#f5f5f5",
          padding: 15,
          borderRadius: 8,
          color: "#183396",
          fontWeight: 600,
          fontSize: 22,
          marginBottom: 16,
          minWidth: 200
        }}
          draggable
          onDragStart={() => setDraggedChar(questions[step].character)}
        >
          {questions[step].character}
        </div>
        <div style={{
          display: "flex",
          gap: "32px",
          margin: "16px 0",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          {[questions[step].movie].concat(
            questions.slice(step + 1, step + 3).map(q => q.movie)
          ).sort(() => 0.5 - Math.random()).map(movie => (
            <div
              key={movie}
              onDrop={e => { handleDrop(movie, e); setDraggedChar(null); }}
              onDragOver={e => e.preventDefault()}
              tabIndex={0}
              style={{
                background: "#e0eefc",
                minWidth: 130,
                minHeight: 50,
                border: selectedMovie === movie ? "2px solid #4796e6" : "2px dashed #aaa",
                borderRadius: 7,
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
                fontSize: 19,
                color: "#111",
                fontWeight: 500,
                margin: 6,
                cursor: "pointer"
              }}
              onClick={() => setSelectedMovie(movie)}
            >
              {movie}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <button type="submit" className="btn btn-large" style={{ marginTop: 16, width: 160, color: "#111", background: "#a9e9c9" }} disabled={!selectedMovie || reveal || justRevealed}>
            Submit
          </button>
        </form>
        <button
          className="btn"
          style={{ marginTop: 12, background: "#efb307", color: "#211" }}
          onClick={handleReveal}
          disabled={reveal || justRevealed}
        >
          Reveal Answer
        </button>
        {reveal && (
          <div style={{ marginTop: 20, color: "#b11324", fontWeight: 600 }}>
            The correct answer: {questions[step].movie}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterMovieMatch;
