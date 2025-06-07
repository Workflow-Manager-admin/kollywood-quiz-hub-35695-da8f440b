import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Character-Movie Match: Drag Kollywood character clue onto correct movie poster (with distractors), 10 quiz rounds.
 * PUBLIC_INTERFACE
 */
function CharacterMovieMatch({ onBackToDashboard }) {
  // Constants for rounds and options per question
  const QUESTIONS = 10;
  const CHOICES_PER_QUESTION = 4;

  // Fallback/demo questions for demo and offline
  const FALLBACK_QUESTIONS = [
    {
      clue: "mukundh varadharajan",
      correctMovie: "Amaran",
      correctMovieObj: {
        title: "Amaran",
        poster_path: "/A4pZ0b8UoLxa6pnx6tEN84ImU8e.jpg",
        id: "fallback1"
      },
      choices: [
        {
          title: "Amaran",
          poster_path: "/A4pZ0b8UoLxa6pnx6tEN84ImU8e.jpg",
          id: "fallback1"
        },
        {
          title: "Mouna Ragam",
          poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
          id: "fallback2"
        },
        {
          title: "Enthiran",
          poster_path: "/cZy1FIKwpsbRdd3RMa9FaXGFDeA.jpg",
          id: "fallback3"
        },
        {
          title: "Gentleman",
          poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
          id: "fallback4"
        }
      ]
    },
    {
      clue: "Anbuchelvan IPS",
      correctMovie: "Kaakha Kaakha",
      correctMovieObj: {
        title: "Kaakha Kaakha",
        poster_path: "/rBl1hlyHmlYSU1l1KFtGVHAUkl6.jpg",
        id: "fallback5"
      },
      choices: [
        {
          title: "Kaakha Kaakha",
          poster_path: "/rBl1hlyHmlYSU1l1KFtGVHAUkl6.jpg",
          id: "fallback5"
        },
        {
          title: "Nayakan",
          poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
          id: "fallback6"
        },
        {
          title: "Sivaji",
          poster_path: "/beAt9HHQ0Uue8Ghs2YXW48UUfZo.jpg",
          id: "fallback7"
        },
        {
          title: "Baasha",
          poster_path: "/84Tp4YRa0tT4uXuI5ArkVWZdFBj.jpg",
          id: "fallback8"
        }
      ]
    },
    {
      clue: "Velu Naicker",
      correctMovie: "Nayakan",
      correctMovieObj: {
        title: "Nayakan",
        poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
        id: "fallback6"
      },
      choices: [
        {
          title: "Nayakan",
          poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
          id: "fallback6"
        },
        {
          title: "Kaakha Kaakha",
          poster_path: "/rBl1hlyHmlYSU1l1KFtGVHAUkl6.jpg",
          id: "fallback5"
        },
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        },
        {
          title: "Gentleman",
          poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
          id: "fallback4"
        }
      ]
    },
    {
      clue: "Gentleman",
      correctMovie: "Gentleman",
      correctMovieObj: {
        title: "Gentleman",
        poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
        id: "fallback4"
      },
      choices: [
        {
          title: "Gentleman",
          poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
          id: "fallback4"
        },
        {
          title: "Mouna Ragam",
          poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
          id: "fallback2"
        },
        {
          title: "Anbe Sivam",
          poster_path: "/nQOeN7HDtbqG7o1lClFFoGmnIke.jpg",
          id: "fallback10"
        },
        {
          title: "Sivaji",
          poster_path: "/beAt9HHQ0Uue8Ghs2YXW48UUfZo.jpg",
          id: "fallback7"
        }
      ]
    },
    {
      clue: "Maari",
      correctMovie: "Maari",
      correctMovieObj: {
        title: "Maari",
        poster_path: "/z8EByWO85jZKq1A1UJt9QEbduVX.jpg",
        id: "fallback11"
      },
      choices: [
        {
          title: "Maari",
          poster_path: "/z8EByWO85jZKq1A1UJt9QEbduVX.jpg",
          id: "fallback11"
        },
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        },
        {
          title: "Nayakan",
          poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
          id: "fallback6"
        },
        {
          title: "Baasha",
          poster_path: "/84Tp4YRa0tT4uXuI5ArkVWZdFBj.jpg",
          id: "fallback8"
        }
      ]
    },
    {
      clue: "Subramani",
      correctMovie: "Mouna Ragam",
      correctMovieObj: {
        title: "Mouna Ragam",
        poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
        id: "fallback2"
      },
      choices: [
        {
          title: "Mouna Ragam",
          poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
          id: "fallback2"
        },
        {
          title: "Amaran",
          poster_path: "/A4pZ0b8UoLxa6pnx6tEN84ImU8e.jpg",
          id: "fallback1"
        },
        {
          title: "Gentleman",
          poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
          id: "fallback4"
        },
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        }
      ]
    },
    {
      clue: "Dhanush",
      correctMovie: "VIP",
      correctMovieObj: {
        title: "VIP",
        poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
        id: "fallback9"
      },
      choices: [
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        },
        {
          title: "Maari",
          poster_path: "/z8EByWO85jZKq1A1UJt9QEbduVX.jpg",
          id: "fallback11"
        },
        {
          title: "Baasha",
          poster_path: "/84Tp4YRa0tT4uXuI5ArkVWZdFBj.jpg",
          id: "fallback8"
        },
        {
          title: "Thillana Mohanambal",
          poster_path: "/jwOhnep5pr8wui1mi3YqTvp6rph.jpg",
          id: "fallback12"
        }
      ]
    },
    {
      clue: "Nallasivam",
      correctMovie: "Anbe Sivam",
      correctMovieObj: {
        title: "Anbe Sivam",
        poster_path: "/nQOeN7HDtbqG7o1lClFFoGmnIke.jpg",
        id: "fallback10"
      },
      choices: [
        {
          title: "Anbe Sivam",
          poster_path: "/nQOeN7HDtbqG7o1lClFFoGmnIke.jpg",
          id: "fallback10"
        },
        {
          title: "Nayakan",
          poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
          id: "fallback6"
        },
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        },
        {
          title: "Kaakha Kaakha",
          poster_path: "/rBl1hlyHmlYSU1l1KFtGVHAUkl6.jpg",
          id: "fallback5"
        }
      ]
    },
    {
      clue: "Rangasamy",
      correctMovie: "Sivaji",
      correctMovieObj: {
        title: "Sivaji",
        poster_path: "/beAt9HHQ0Uue8Ghs2YXW48UUfZo.jpg",
        id: "fallback7"
      },
      choices: [
        {
          title: "Sivaji",
          poster_path: "/beAt9HHQ0Uue8Ghs2YXW48UUfZo.jpg",
          id: "fallback7"
        },
        {
          title: "Thillana Mohanambal",
          poster_path: "/jwOhnep5pr8wui1mi3YqTvp6rph.jpg",
          id: "fallback12"
        },
        {
          title: "Gentleman",
          poster_path: "/pBvGlZ4Xd0G4MmJwCuWHa3gwxM7.jpg",
          id: "fallback4"
        },
        {
          title: "Baasha",
          poster_path: "/84Tp4YRa0tT4uXuI5ArkVWZdFBj.jpg",
          id: "fallback8"
        }
      ]
    },
    {
      clue: "Saroja Devi",
      correctMovie: "Thillana Mohanambal",
      correctMovieObj: {
        title: "Thillana Mohanambal",
        poster_path: "/jwOhnep5pr8wui1mi3YqTvp6rph.jpg",
        id: "fallback12"
      },
      choices: [
        {
          title: "Thillana Mohanambal",
          poster_path: "/jwOhnep5pr8wui1mi3YqTvp6rph.jpg",
          id: "fallback12"
        },
        {
          title: "Nayakan",
          poster_path: "/7oYtN73IXOcxXvvzS8T3ewlm8d4.jpg",
          id: "fallback6"
        },
        {
          title: "VIP",
          poster_path: "/wrE2HLQaaQ5yC6hG65B7VMaNaEC.jpg",
          id: "fallback9"
        },
        {
          title: "Anbe Sivam",
          poster_path: "/nQOeN7HDtbqG7o1lClFFoGmnIke.jpg",
          id: "fallback10"
        }
      ]
    }
  ];

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

  // State management
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [draggedClue, setDraggedClue] = useState(null);
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

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
    { character: "Rangasamy", movie: "Sivaji" }
  ];

  // Build rounds from API or fallback on mount
  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies().then(movies => {
      const withPosters = movies.filter(m => !!m.title && !!m.poster_path && m.poster_path.length > 0);
      const rounds = CHARACTER_MOVIE_PAIRS
        .map(pair => {
          const movieObj = withPosters.find(
            m => m.title.toLowerCase() === pair.movie.toLowerCase()
          );
          if (!movieObj) return null;
          let distractorPool = withPosters.filter(m => m.title !== pair.movie).sort(() => 0.5 - Math.random());
          let distractors = distractorPool.slice(0, CHOICES_PER_QUESTION - 1);
          const options = [movieObj, ...distractors].sort(() => 0.5 - Math.random());
          return {
            clue: pair.character,
            correctMovie: pair.movie,
            correctMovieObj: movieObj,
            choices: options
          };
        })
        .filter(Boolean)
        .slice(0, QUESTIONS);

      // Poster fallback/logging diagnostics
      if (window?.console) {
        if (withPosters.length < 15) {
          console.warn("[CharacterMovieMatch] Low movie poster pool from API:", withPosters.length);
        }
      }

      // Should fallback if not enough rounds or posterless
      const shouldFallback = (
        rounds.length < QUESTIONS ||
        rounds.some(
          r =>
            !r.correctMovieObj ||
            !r.correctMovieObj.poster_path ||
            r.choices.some(c => !c.poster_path)
        )
      );
      if (shouldFallback) {
        if (window?.console) {
          console.error("[CharacterMovieMatch] Using fallback: insufficient TMDB/quiz data; details:", {
            gotRounds: rounds.length,
            sampleRound: rounds[0],
            withPostersSample: withPosters[0]
          });
        }
        setQuestions(FALLBACK_QUESTIONS);
        setUsingFallback(true);
      } else {
        setQuestions(rounds);
        setUsingFallback(false);
      }
      setLoading(false);
    }).catch(err => {
      if (window?.console)
        console.error("[CharacterMovieMatch] TMDB fetch failed, using fallback.", err);
      setQuestions(FALLBACK_QUESTIONS);
      setUsingFallback(true);
      setLoading(false);
    });
  // eslint-disable-next-line
  }, []);

  // Drag/drop handlers
  function handleDragStart() {
    setDraggedClue(questions[step]);
    setDragActive(true);
  }

  function handleDragEnd() {
    setDraggedClue(null);
    setDragActive(false);
  }

  function allowDrop(event) {
    event.preventDefault();
    setDragActive(true);
  }

  function leaveDrop(event) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDropOnPoster(movieObj, idx, event) {
    event.preventDefault();
    if (answeredIdx !== null) return;
    setAnsweredIdx(idx);
    setTimeout(() => recordAnswer(movieObj), 350);
  }

  function recordAnswer(selectedMovieObj) {
    const isCorrect = selectedMovieObj.title === questions[step].correctMovie;
    setUserAnswers(prev => [
      ...prev,
      {
        character: questions[step].clue,
        answerTitle: selectedMovieObj.title,
        wasCorrect: isCorrect,
        correctTitle: questions[step].correctMovie
      }
    ]);
    setAnsweredIdx(null);
    setDragActive(false);
    setTimeout(() => {
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 450);
  }

  // Reveal/give up
  function handleReveal() {
    setReveal(true);
    setUserAnswers(prev => [
      ...prev,
      {
        character: questions[step].clue,
        answerTitle: "(revealed)",
        wasCorrect: false,
        correctTitle: questions[step].correctMovie,
        revealed: true
      }
    ]);
    setTimeout(() => {
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        Loading quiz...
      </div>
    );
  }

  if (quizOver) {
    return (
      <QuizResult
        score={userAnswers.filter(a => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Character-Movie Match"
      />
    );
  }

  // Defensive/fallback for missing question
  if (!questions[step]) {
    const fb = FALLBACK_QUESTIONS[0];
    return (
      <div className="container" style={{ paddingTop: 100, marginBottom: 40 }}>
        <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
          ⬅ Back
        </button>
        <QuizProgress current={1} total={QUESTIONS} />
        <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
          Character-Movie Match (Fallback)
        </h2>
        <div className="description" style={{ marginBottom: 18 }}>
          Fallback: Drag the <b>character clue</b> onto the correct movie poster. (Demo Mode)
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
              boxShadow: "0 0 12px #dde4fa",
              opacity: 1,
              cursor: "grab"
            }}
          >
            {fb.clue}
          </div>
          <div
            style={{
              display: "flex",
              gap: "32px",
              margin: "16px 0 24px 0",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
            {Array.isArray(fb.choices) && fb.choices.length > 0 ? (
              <React.Fragment>
                {fb.choices.map((movieObj, idx) => (
                  <div
                    key={movieObj.id || idx}
                    style={{
                      background: "#f7faff",
                      minWidth: 130,
                      minHeight: 210,
                      border: movieObj.title === fb.correctMovie ? "3px solid #2acd86" : "2px solid #bae8f7",
                      borderRadius: 12,
                      alignItems: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      fontSize: 19,
                      color: "#111",
                      fontWeight: 500,
                      margin: 6,
                      boxShadow: "0 3px 10px #ecf2fb",
                      position: "relative"
                    }}
                    tabIndex={0}
                    aria-label={`Demo poster for ${movieObj.title}`}
                  >
                    {movieObj.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${movieObj.poster_path}`}
                        alt={movieObj.title ? `Poster for ${movieObj.title}` : "Movie Poster"}
                        style={{
                          width: "110px",
                          height: "160px",
                          borderRadius: 7,
                          objectFit: "cover",
                          boxShadow: "0 4px 16px #b3d5ef33",
                          marginTop: 14,
                          marginBottom: 8,
                          border: "2px solid #cbeef3",
                          background: "#ebf5fb"
                        }}
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = "none";
                          const fallbackDiv = document.createElement("div");
                          fallbackDiv.textContent = "Poster Unavailable";
                          fallbackDiv.style.width = "110px";
                          fallbackDiv.style.height = "160px";
                          fallbackDiv.style.background = "#d3e0ea";
                          fallbackDiv.style.borderRadius = "6px";
                          fallbackDiv.style.marginTop = "14px";
                          fallbackDiv.style.display = "flex";
                          fallbackDiv.style.alignItems = "center";
                          fallbackDiv.style.justifyContent = "center";
                          fallbackDiv.style.color = "#678";
                          fallbackDiv.style.fontSize = "12px";
                          fallbackDiv.style.fontWeight = "500";
                          e.currentTarget.parentNode.appendChild(fallbackDiv);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 110, height: 160, background: "#d3e0ea",
                        borderRadius: 6, marginTop: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#678", fontSize: 12, fontWeight: 500
                      }}>
                        No Poster
                      </div>
                    )}
                    <div style={{
                      marginTop: 4, textAlign: "center", fontWeight: 600, fontSize: 16,
                      width: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      userSelect: "none", background: "rgba(245,250,250, 0.8)", borderRadius: 6, padding: "4px 0"
                    }}>
                      {movieObj.title}
                    </div>
                    {movieObj.title === fb.correctMovie && (
                      <span style={{
                        position: "absolute", right: 10, top: 10, fontSize: 32, color: "#2acd86"
                      }}>✔️</span>
                    )}
                  </div>
                ))}
              </React.Fragment>
            ) : (
              <div>No poster choices available.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal round UI ---
  const question = questions[step];

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 40 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      {usingFallback && (
        <div
          style={{
            background: "#fffbe2",
            color: "#bb8900",
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: 7,
            marginBottom: 12,
            boxShadow: "0 2px 11px #fedc8915, 0 0px 1px #fff6b3 inset",
            fontSize: 15
          }}
          aria-live="polite"
        >
          Fallback questions in use — TMDB data was unavailable. Posters and clues are from hardcoded demo set.
        </div>
      )}
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
        Character-Movie Match
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Drag the <b>character clue</b> onto the correct movie poster.<br />
        {`(1 correct poster, ${CHOICES_PER_QUESTION - 1} decoy posters per round)`}
      </div>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center"
      }}>
        {/* DRAGGABLE CLUE */}
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
          {Array.isArray(question.choices) && question.choices.length > 0 ? (
            <React.Fragment>
              {question.choices.map((movieObj, idx) => {
                // Always log poster info for diagnostics
                if (window?.console) {
                  // Poster URL logging per requirement
                  console.log(`[CharacterMovieMatch][Round=${step + 1}][Option=${idx}]`, {
                    title: movieObj.title,
                    poster_path: movieObj.poster_path,
                    TMDB_IMAGE_BASE,
                    url: movieObj.poster_path ? `${TMDB_IMAGE_BASE}${movieObj.poster_path}` : null,
                  });
                  if (!movieObj.poster_path) {
                    console.warn(`[CharacterMovieMatch][Round=${step + 1}][Option=${idx}] poster_path missing`, movieObj);
                  }
                }
                return (
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
                        src={`${TMDB_IMAGE_BASE}${movieObj.poster_path}`}
                        alt={movieObj.title ? `Poster for ${movieObj.title}` : "Movie Poster"}
                        style={{
                          width: "110px",
                          height: "160px",
                          borderRadius: 7,
                          objectFit: "cover",
                          boxShadow: "0 4px 16px #b3d5ef33",
                          marginTop: 14,
                          marginBottom: 8,
                          border: "2px solid #cbeef3",
                          background: "#ebf5fb"
                        }}
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = "none";
                          const fallbackDiv = document.createElement("div");
                          fallbackDiv.textContent = "Poster Unavailable";
                          fallbackDiv.style.width = "110px";
                          fallbackDiv.style.height = "160px";
                          fallbackDiv.style.background = "#d3e0ea";
                          fallbackDiv.style.borderRadius = "6px";
                          fallbackDiv.style.marginTop = "14px";
                          fallbackDiv.style.display = "flex";
                          fallbackDiv.style.alignItems = "center";
                          fallbackDiv.style.justifyContent = "center";
                          fallbackDiv.style.color = "#678";
                          fallbackDiv.style.fontSize = "12px";
                          fallbackDiv.style.fontWeight = "500";
                          e.currentTarget.parentNode.appendChild(fallbackDiv);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 110, height: 160, background: "#d3e0ea",
                        borderRadius: 6, marginTop: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#678", fontSize: 12, fontWeight: 500
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
                );
              })}
            </React.Fragment>
          ) : (
            <div>No poster choices available.</div>
          )}
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
