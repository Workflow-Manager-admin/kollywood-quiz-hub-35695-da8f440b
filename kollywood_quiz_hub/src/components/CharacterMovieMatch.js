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
  // How many choices per question (including the correct one)
  const CHOICES_PER_QUESTION = 3;
  // Static (stub) list of characters matched to movies
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

  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState("");
  const [draggedChar, setDraggedChar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quizOver, setQuizOver] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  // PUBLIC_INTERFACE
  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then((allMovies) => {
        // Build all possible character-movie pairs where the movie exists in the TMDB response
        const validPairs = [];
        // For fast lookup
        const movieTitleToObj = {};
        allMovies.forEach((movie) => {
          movieTitleToObj[movie.title] = movie;
        });

        CHARACTERS.forEach((char) => {
          char.movies.forEach((mov) => {
            if (movieTitleToObj[mov]) {
              validPairs.push({
                character: char.name,
                movie: mov,
                movieObj: movieTitleToObj[mov],
              });
            }
          });
        });

        // Shuffle pairs, select up to QUESTIONS
        const shuffledPairs = validPairs.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS);

        // If too few pairs, fill with random extra pairs
        let resultQuestions = [...shuffledPairs];
        if (resultQuestions.length < QUESTIONS) {
          // Pick from allMovies that aren't already included
          const usedMovieNames = new Set(resultQuestions.map(q => q.movie));
          let charIdx = 0;
          for (let i = 0; i < allMovies.length && resultQuestions.length < QUESTIONS; ++i) {
            const movie = allMovies[i];
            if (!usedMovieNames.has(movie.title)) {
              // Rotate through CHARACTERS to assign, or fallback to dummy
              const ch = CHARACTERS[charIdx % CHARACTERS.length];
              resultQuestions.push({
                character: ch.name,
                movie: movie.title,
                movieObj: movie,
              });
              usedMovieNames.add(movie.title);
              charIdx++;
            }
          }
        }

        // For each question, build the option set: correct movie + random distractors
        const buildChoicesForQuestions = () => {
          // Avoid repeats (do not use correct movie as a distractor in the same question)
          const allPool = allMovies.filter(m =>
            m.poster_path && m.title // Make sure some poster and title exist
          );
          // fallback: if not enough with posters, allow any
          function getDistractors(correctMovieTitle) {
            // Pick random movies (not correct answer) from allPool
            const distractors = [];
            const shuffled = allPool
              .filter(m => m.title !== correctMovieTitle)
              .sort(() => 0.5 - Math.random());
            for (let i = 0; i < shuffled.length && distractors.length < CHOICES_PER_QUESTION - 1; ++i) {
              // Avoid blank/duplicate posters in same set
              if (!distractors.find(d => d.title === shuffled[i].title)) {
                distractors.push({
                  movie: shuffled[i].title,
                  movieObj: shuffled[i],
                });
              }
            }
            return distractors;
          }

          return resultQuestions.map((qInfo) => {
            const correctOption = {
              movie: qInfo.movie,
              movieObj: qInfo.movieObj,
            };
            // Select distractors
            let distractors = getDistractors(qInfo.movie);
            // If not enough distractors, fallback to others (even without posters)
            if (distractors.length < CHOICES_PER_QUESTION - 1) {
              const others = allMovies
                .filter(m => m.title !== qInfo.movie)
                .filter(m => !distractors.find(d => d.movie === m.title))
                .sort(() => 0.5 - Math.random());
              for (let i = 0; i < others.length && distractors.length < CHOICES_PER_QUESTION - 1; ++i) {
                distractors.push({
                  movie: others[i].title,
                  movieObj: others[i],
                });
              }
            }
            // Always have correct + distractors
            const choices = [correctOption, ...distractors];
            // Shuffle for display
            const shuffledOpts = choices.sort(() => 0.5 - Math.random()).slice(0, CHOICES_PER_QUESTION);
            return {
              character: qInfo.character,
              correctMovie: qInfo.movie, // title string
              correctMovieObj: qInfo.movieObj,
              choices: shuffledOpts,
            };
          });
        };

        setQuestions(buildChoicesForQuestions());
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
        actualMovie: questions[step].correctMovie,
        wasCorrect: selectedMovie === questions[step].correctMovie,
        character: questions[step].character,
      },
    ]);
    setSelectedMovie("");
    if (step + 1 === QUESTIONS) setQuizOver(true);
    else setStep(step + 1);
  }

  function handleReveal() {
    setReveal(true);
    setUserAnswers([
      ...userAnswers,
      {
        guessedMovie: "",
        actualMovie: questions[step].correctMovie,
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

  // Display question: show the character and randomized movie choices; correct answer MUST always be present among the choices.
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
        Match the Kollywood character to their movie (by dragging or clicking).
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
          {/* Show movie choices; correct answer always present */}
          {questions[step].choices.map(opt => (
            <div
              key={opt.movie}
              onDrop={e => { handleDrop(opt.movie, e); setDraggedChar(null); }}
              onDragOver={e => e.preventDefault()}
              tabIndex={0}
              style={{
                background: "#e0eefc",
                minWidth: 130,
                minHeight: 180,
                border: selectedMovie === opt.movie ? "2px solid #4796e6" : "2px dashed #aaa",
                borderRadius: 7,
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                fontSize: 19,
                color: "#111",
                fontWeight: 500,
                margin: 6,
                cursor: "pointer",
                boxShadow: selectedMovie === opt.movie ? "0 2px 12px #b9e5ff" : "0 1px 6px #e2f2fd"
              }}
              onClick={() => setSelectedMovie(opt.movie)}
            >
              {opt.movieObj.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${opt.movieObj.poster_path}`}
                  alt={opt.movie}
                  style={{
                    width: "100%",
                    maxWidth: 120,
                    height: "auto",
                    aspectRatio: "110/160",
                    borderRadius: "6px",
                    objectFit: "cover",
                    marginTop: 10,
                    marginBottom: 0,
                    background: "#eaf1ff",
                    border: selectedMovie === opt.movie
                      ? "2px solid #4796e6"
                      : "2px solid #e0eefc",
                    boxShadow: selectedMovie === opt.movie
                      ? "0 2px 12px #b9e5ff"
                      : "0 1px 4px #e2f2fd"
                  }}
                  loading="lazy"
                />
              ) : (
                <div style={{
                  width: 110,
                  height: 160,
                  background: "#ccd7e9",
                  borderRadius: 5,
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#789",
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  No Poster
                </div>
              )}
              <div style={{
                marginTop: 10,
                textAlign: "center",
                fontWeight: 600,
                fontSize: 17,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: 110
              }}>
                {opt.movie}
              </div>
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
            The correct answer: {questions[step].correctMovie}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterMovieMatch;
