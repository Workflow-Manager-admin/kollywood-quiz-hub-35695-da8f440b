import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Character-Movie Match Component
 * PUBLIC_INTERFACE
 * Presents a Kollywood character and choices of movies (with posters and names).
 * For each question, ensures the correct movie (matching character) is always one of the options,
 * the remaining options are random plausible distractors (not the answer),
 * and all options have both poster and title whenever possible.
 */
function CharacterMovieMatch({ onBackToDashboard }) {
  const QUESTIONS = 10;
  // How many choices per question (including the correct one)
  const CHOICES_PER_QUESTION = 3;
  // Static (stub) list of characters matched to movies
  // All character names match a canonical famous character with distinct (primary) movie titles.
  // Each entry has character: string, movies: array of canonical (release title matched) movie names
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
    // Add more as needed for variety & robustness
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
        // 1. Build array of only real (character, movie) pairs where the movie exists in TMDB AND has a poster (for proper UI)
        const movieTitleToObj = {};
        allMovies.forEach((movie) => {
          if (movie.title && movie.poster_path) {
            movieTitleToObj[movie.title] = movie;
          }
        });

        // Only push genuine pairings from CHARACTERS; exclude those where poster is not available in TMDB
        const validPairs = [];
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

        // If not enough valid pairs, use as many as we have, but always ensure at least one.
        let selectedPairs = validPairs
          .sort(() => 0.5 - Math.random())
          .slice(0, QUESTIONS);

        // If we have no valid pairs (API/data error), generate a dummy fallback question
        if (selectedPairs.length === 0) {
          // Try to use random movies as fake chars if available, else hard code fallback
          const fallbackMovies = allMovies.filter(m => !!m.title && !!m.poster_path);
          if (fallbackMovies.length > 0) {
            selectedPairs = [{
              character: "Fallback Character",
              movie: fallbackMovies[0].title,
              movieObj: fallbackMovies[0]
            }];
          } else {
            selectedPairs = [{
              character: "Fallback Char",
              movie: "Unavailable Movie",
              movieObj: { title: "Unavailable Movie", poster_path: "", id: -1 }
            }];
          }
        }

        // Prepare a set of all movies that can be used as distractors (with poster & title, not the correct answer)
        const distractorPool = allMovies.filter(
          m => !!m.title && !!m.poster_path
        );

        // Create questions array: Each clue is character (from selectedPair), correct answer is associated movie,
        // options contain the correct answer and two distractors not tied to the clue's character.
        const questionsBuilt = selectedPairs.map(pair => {
          // Find distractors that are not correct (by title), and are not tied to this character in CHARACTERS
          const charMovieTitles = CHARACTERS
            .find(c => c.name === pair.character)?.movies || [];
          const correctMovieTitle = pair.movie;

          // Find distractors that are not associated with this character at all and not the answer
          let possibleDistractors = distractorPool.filter(m =>
            m.title !== correctMovieTitle && !charMovieTitles.includes(m.title)
          );

          // Shuffle to pick random distractors
          possibleDistractors = possibleDistractors.sort(() => 0.5 - Math.random());

          // Pick two distractors, fallback to as many as possible
          const distractorOptions = possibleDistractors.slice(0, CHOICES_PER_QUESTION - 1).map(m => ({
            movie: m.title,
            movieObj: m
          }));

          // Always include correct answer option as object (may fallback)
          const correctOption = {
            movie: pair.movieObj.title,
            movieObj: pair.movieObj
          };

          // Combine and shuffle options, but only use as many as possible (never <1)
          let options = [correctOption, ...distractorOptions].sort(() => 0.5 - Math.random());
          if (options.length === 0) {
            // Absolute fallback - should never happen, but just in case
            options = [{ movie: correctOption.movie, movieObj: correctOption.movieObj }];
          }

          // Guarantee there are only CHOICES_PER_QUESTION options or as many as possible, but never empty
          return {
            character: pair.character,
            correctMovie: correctMovieTitle,
            correctMovieObj: pair.movieObj,
            choices: options.slice(0, CHOICES_PER_QUESTION)
          };
        });

        setQuestions(questionsBuilt);
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
  // Instead of returning null, render a user-friendly error if something went wrong
  if (!questions[step]) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <h2 className="title" style={{ fontSize: "1.2em" }}>Character-Movie Match</h2>
        <div className="description" style={{ color: "#b72d2d", marginBottom: 20 }}>
          Sorry, could not load quiz questions for this game.<br />
          Please try reloading the page, or pick a different quiz game from the dashboard.
        </div>
        <button className="btn btn-large" onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  }

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
