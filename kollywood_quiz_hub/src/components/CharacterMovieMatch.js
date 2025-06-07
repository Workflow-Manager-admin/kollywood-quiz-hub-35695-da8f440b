import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Character-Movie Match: Drag Kollywood character clue onto correct movie poster (with distractors), 10 quiz rounds.
 * PUBLIC_INTERFACE
 */
function CharacterMovieMatch({ onBackToDashboard }) {
  // Number of rounds/rounds
  const QUESTIONS = 10;
  // Choices per question (1 correct + this many distractors)
  const CHOICES_PER_QUESTION = 4;

  // List of clue characters and their associated movies (primary roles, all matches should exist in TMDB pool)
  // Each entry: { character: String, movie: String }
  const CHARACTER_MOVIE_PAIRS = [
    { character: "Chitti", movie: "Enthiran" },
    { character: "Anbuchelvan IPS", movie: "Kaakha Kaakha" },
    { character: "Velu Naicker", movie: "Nayakan" },
    { character: "Gentleman", movie: "Gentleman" },
    { character: "Saroja Devi", movie: "Thillana Mohanambal" },
    { character: "Maari", movie: "Maari" },
    { character: "Subramani", movie: "Mouna Ragam" },
    { character: "Dhanush", movie: "VIP" },
    { character: "Nallasivam", movie: "Anbe Sivam" },
    { character: "Rangasamy", movie: "Sivaji" },
    // Add more if needed later
  ];

  // State declarations
  const [allMovies, setAllMovies] = useState([]);
  const [questions, setQuestions] = useState([]); // One entry per quiz round: { clue, correctMovieObj, choices: [movieObj,...] }
  const [step, setStep] = useState(0); // current question index
  const [dragActive, setDragActive] = useState(false);
  const [draggedClue, setDraggedClue] = useState(null); // {character, movie}
  const [answeredIdx, setAnsweredIdx] = useState(null); // to mark which card was answered
  const [userAnswers, setUserAnswers] = useState([]); // each: { character, answerTitle, wasCorrect, correctTitle }
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);

  // PUBLIC_INTERFACE: On mount, fetch movies and prepare the quiz set (10 rounds, each with proper answer & distractors)
  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then((movies) => {
        const withPosters = movies.filter(
          (m) => m.title && m.poster_path && m.poster_path.length > 0
        );

        // Build answer pool for the rounds: map characters to actual available movies (with poster)
        const answerPool = CHARACTER_MOVIE_PAIRS.map(pair => {
          const movieObj = withPosters.find(
            m => m.title.toLowerCase() === pair.movie.toLowerCase()
          );
          return movieObj
            ? { character: pair.character, movie: pair.movie, movieObj }
            : null;
        }).filter(Boolean);

        // Use only as many as possible with actual poster, max 10
        const rounds = answerPool.slice(0, QUESTIONS);

        // For each round, build answer + distractors
        const roundData = rounds.map(ans => {
          // Pool for distractors: exclude the correct movie (by title)
          let distractorPool = withPosters
            .filter(m => m.title !== ans.movie)
            .sort(() => 0.5 - Math.random());

          // Choose distractor objects (as full movieObjs)
          let distractors = distractorPool.slice(0, CHOICES_PER_QUESTION - 1);

          // Combine and shuffle
          const options = [ans.movieObj, ...distractors].sort(() => 0.5 - Math.random());
          return {
            clue: ans.character,
            correctMovie: ans.movie,
            correctMovieObj: ans.movieObj,
            choices: options,
          };
        });

        setAllMovies(withPosters); // Save for possible fallback use
        setQuestions(roundData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle drop on a movie poster (answer selection)
  function handleDropOnPoster(movieObj, idx, event) {
    event.preventDefault();
    if (answeredIdx !== null) return;
    setAnsweredIdx(idx);

    // After visual feedback, score and move on
    setTimeout(() => {
      recordAnswer(movieObj);
    }, 350); // 0.35s for feedback
  }

  function allowDrop(event) {
    event.preventDefault();
    setDragActive(true);
  }
  function leaveDrop(event) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDragStart() {
    setDraggedClue(questions[step]);
    setDragActive(true);
  }
  function handleDragEnd() {
    setDraggedClue(null);
    setDragActive(false);
  }

  function recordAnswer(selectedMovieObj) {
    if (!questions[step]) return;
    const isCorrect = selectedMovieObj.title === questions[step].correctMovie;
    setUserAnswers([
      ...userAnswers,
      {
        character: questions[step].clue,
        answerTitle: selectedMovieObj.title,
        wasCorrect: isCorrect,
        correctTitle: questions[step].correctMovie,
      },
    ]);
    setAnsweredIdx(null);
    setDragActive(false);

    // Proceed to next or show result after brief pause
    setTimeout(() => {
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 450);
  }

  // For reveal button (treat as "give up", add wrong answer and move forward)
  function handleReveal() {
    setReveal(true);
    setUserAnswers([
      ...userAnswers,
      {
        character: questions[step].clue,
        answerTitle: "(revealed)",
        wasCorrect: false,
        correctTitle: questions[step].correctMovie,
        revealed: true,
      },
    ]);
    setTimeout(() => {
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // Loading state
  if (loading)
    return <div className="container" style={{ paddingTop: 120 }}>Loading quiz...</div>;
  // End of quiz
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
  // No valid questions? Show fallback.
  if (!questions[step]) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <h2 className="title" style={{ fontSize: "1.25em" }}>Character-Movie Match</h2>
        <div className="description" style={{ color: "#c23616", marginBottom: 20 }}>
          Sorry, no quiz questions could be generated right now.<br />
          Please try again later or reload to retry.
        </div>
        <button className="btn btn-large" onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  }

  // Render single quiz round
  const question = questions[step];

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 40 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
        Character-Movie Match
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Drag the <b>character clue</b> onto the correct movie poster.
        <br />
        {`(1 correct poster, ${CHOICES_PER_QUESTION - 1} decoy posters per round)`}
      </div>

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* DRAGGABLE CHARACTER CLUE */}
        <div
          style={{
            background: "#f6fcfc",
            color: "#1255ae",
            fontWeight: 600,
            fontSize: 28,
            borderRadius: 10,
            padding: "22px 34px",
            margin: "15px 0 20px 0",
            minWidth: 220,
            boxShadow: dragActive ? "0 0 16px #a7e6ec" : "0 0 8px #dde4fa",
            opacity: reveal ? 0.4 : 1,
            cursor: reveal ? "not-allowed" : "grab",
            transition: "box-shadow 0.18s, opacity 0.16s"
          }}
          draggable={!reveal}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {question.clue}
        </div>
        {/* POSTER CHOICES */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            margin: "16px 0 24px 0",
            justifyContent: "center",
            flexWrap: "wrap",
            opacity: reveal ? 0.4 : 1,
            pointerEvents: reveal ? "none" : "auto"
          }}
        >
          {question.choices.map((movieObj, idx) => (
            <div
              key={movieObj.id || idx}
              onDrop={e => handleDropOnPoster(movieObj, idx, e)}
              onDragOver={allowDrop}
              onDragLeave={leaveDrop}
              style={{
                background: "#f7faff",
                minWidth: 130,
                minHeight: 210,
                border: answeredIdx === idx
                  ? (movieObj.title === question.correctMovie ? "3px solid #2acd86" : "3px solid #da364a")
                  : "2px solid #bae8f7",
                borderRadius: 12,
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                fontSize: 19,
                color: "#111",
                fontWeight: 500,
                margin: 6,
                cursor: dragActive && !reveal ? "pointer" : "default",
                boxShadow: answeredIdx === idx
                  ? (movieObj.title === question.correctMovie ? "0 0 18px #49f1b7" : "0 0 14px #ffb2bc")
                  : "0 3px 10px #ecf2fb",
                opacity: dragActive ? 0.93 : 1,
                position: "relative",
                transition: "box-shadow 0.25s, border 0.21s, opacity 0.12s"
              }}
              tabIndex={0}
              aria-label={`Drop character here for ${movieObj.title}`}
            >
              {movieObj.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${movieObj.poster_path}`}
                  alt={movieObj.title}
                  style={{
                    width: "110px",
                    height: "160px",
                    borderRadius: 7,
                    objectFit: "cover",
                    boxShadow: "0 4px 16px #b3d5ef33",
                    marginTop: 14,
                    marginBottom: 8,
                    border: "2px solid #cbeef3",
                    background: "#ebf5fb",
                  }}
                  loading="lazy"
                />
              ) : (
                <div style={{
                  width: 110, height: 160, background: "#d3e0ea",
                  borderRadius: 6, marginTop: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#678", fontSize: 12,
                  fontWeight: 500,
                }}>
                  No Poster
                </div>
              )}
              <div style={{
                marginTop: 4,
                textAlign: "center",
                fontWeight: 600,
                fontSize: 16,
                width: 120,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                userSelect: "none",
                background: "rgba(245,250,250, 0.8)",
                borderRadius: 6,
                padding: "4px 0"
              }}>
                {movieObj.title}
              </div>
              {/* Feedback tick/cross icon only if answered */}
              {answeredIdx === idx && (
                <span style={{
                  position: "absolute",
                  right: 10,
                  top: 10,
                  fontSize: 32,
                  color: movieObj.title === question.correctMovie ? "#2acd86" : "#ed2e40"
                }}>
                  {movieObj.title === question.correctMovie ? "✔️" : "✖️"}
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn"
          style={{
            marginTop: 8, color: "#432", background: "#ffe14d",
            pointerEvents: reveal ? "none" : "auto"
          }}
          onClick={handleReveal}
          disabled={reveal}
        >
          Reveal Answer
        </button>

        {reveal && (
          <div style={{ marginTop: 23, color: "#ed3529", fontWeight: 700, fontSize: 18 }}>
            The correct answer: {question.correctMovie}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterMovieMatch;

