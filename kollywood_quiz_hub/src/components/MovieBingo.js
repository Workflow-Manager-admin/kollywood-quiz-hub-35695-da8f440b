import React, { useState, useEffect } from "react";
import QuizResult from "./QuizResult";

/**
 * PUBLIC_INTERFACE
 * MovieBingo
 * - 3x3 grid of unique Kollywood movies (never used before, TMDB powered)
 * - 9 rounds: Each round asks a unique question referencing a specific movie in the grid.
 * - User answers by clicking one grid cell. Shows feedback (green for correct, red for incorrect), disables input, advances to next round.
 * - After 9 rounds, a completion summary with results is shown.
 * - Robust error state & fallback handling (always tries to show a working game if possible).
 */
const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59"; // Use provided API key
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Used movie title list (for all OTHER games) — never repeat these (case-insensitive, normalized).
const PREVIOUSLY_USED_MOVIES = [
  // Poster Quiz, Emoji Quiz, Character-Movie, etc.
  "Enthiran", "3 Idiots", "Premam", "Kaakha Kaakha", "Baasha",
  "Vikram Vedha", "Super Deluxe", "Nayakan", "I", "Mersal",
  "Meiyazhagan", "Cuckoo", "Muthu", "Maari", "Mouna Ragam",
  "Anbe Sivam", "Sivaji", "Gentleman", "VIP", "Amaran"
];
/** Helper: Normalize movie titles for exclusion. */
function normalizeTitle(title) {
  return (title || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
}
const PREV_MOVIE_SET = new Set(PREVIOUSLY_USED_MOVIES.map(normalizeTitle));

// TMDB fetchers
async function fetchKollywoodMoviePage(page = 1) {
  // Discover Tamil movies, popular, paginated
  const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("TMDB discover failed");
  return (await resp.json()).results || [];
}
async function fetchUniqueKollywoodMovies(n = 9) {
  // Fetches N unique movies, excludes any in PREV_MOVIE_SET, retries up to 12 TMDB pages.
  let found = [];
  let seen = new Set();
  let page = 1;
  let tries = 0;
  let maxPages = 14;
  while (found.length < n && tries < maxPages) {
    let movies = [];
    try {
      movies = await fetchKollywoodMoviePage(page);
    } catch (e) {
      tries++; page++;
      continue;
    }
    movies.forEach(m => {
      if (
        m && m.title &&
        !PREV_MOVIE_SET.has(normalizeTitle(m.title)) &&
        !seen.has(normalizeTitle(m.title)) &&
        m.title.trim().length > 0
      ) {
        found.push(m);
        seen.add(normalizeTitle(m.title));
      }
    });
    tries++; page++;
  }
  return found.slice(0, n);
}

/** > Robust fallback for 9 movies (should never overlap prior-used). */
function fallbackMoviesList() {
  // In case of API/network failure.
  const fallbackTitles = [
    "Subramaniapuram", "Pariyerum Perumal", "96", "Visaranai", "Jigarthanda",
    "Ratsasan", "Pasanga", "Thamizh", "Aruvi"
  ];
  return fallbackTitles.map((title, idx) => ({
    id: "fb-" + idx,
    title,
    release_date: "20" + ((11 + idx) % 18).toString().padStart(2, "0") + "-01-01",
    overview: "",
    genre_ids: [],
  }));
}

// --- Core question set. Each returns (questionText, movie to be the "answer", answer checker)
// Could be expanded with more TMDB lookups for greater dynamic content.
const QUESTION_BANK = [
  {
    key: "nationalAward",
    question: "Which movie in this Bingo grid won a National Award?",
    find: ms => ms.find(m => /visaranai|pariyerum perumal|aadukalam|jigarthanda/i.test(m.title)),
    isCorrect: (movie, all) => /visaranai|pariyerum perumal|aadukalam|jigarthanda/i.test(movie.title)
  },
  {
    key: "romance",
    question: "Which movie is a romantic drama?",
    find: ms => ms.find(m =>
      (m.genre_ids && m.genre_ids.includes(10749)) ||
      /(love|romantic|romance|couple)/i.test(m.overview) ||
      /96|r/m.test(m.title)
    ),
    isCorrect: m =>
      (m.genre_ids && m.genre_ids.includes(10749)) ||
      /(love|romantic|romance|couple)/i.test(m.overview) ||
      /96|r/m.test(m.title)
  },
  {
    key: "police",
    question: "Which movie is about a police officer or investigation?",
    find: ms => ms.find(m => /(police|cop|investigation|crime|officer)/i.test(m.overview) || /visaranai|ratsasan/i.test(m.title)),
    isCorrect: m => /(police|cop|investigation|crime|officer)/i.test(m.overview) || /visaranai|ratsasan/i.test(m.title)
  },
  {
    key: "comingOfAge",
    question: "Which movie is about children or coming-of-age?",
    find: ms => ms.find(m => /(children|school|coming of age|class|boy|girl)/i.test(m.overview) || /pasanga/i.test(m.title)),
    isCorrect: m => /(children|school|coming of age|class|boy|girl)/i.test(m.overview) || /pasanga/i.test(m.title),
  },
  {
    key: "revenge",
    question: "Which movie involves revenge?",
    find: ms => ms.find(m => /(revenge|avenge|vengeance)/i.test(m.overview) || /ratsasan|jigarthanda|visaranai/i.test(m.title)),
    isCorrect: m => /(revenge|avenge|vengeance)/i.test(m.overview) || /ratsasan|jigarthanda|visaranai/i.test(m.title),
  },
  {
    key: "music",
    question: "Which movie is famous for its music or songs?",
    find: ms => ms.find(m =>
      /(music|song|melody|score)/i.test(m.overview) ||
      /96|aruvi|jigarthanda/i.test(m.title)
    ),
    isCorrect: m =>
      /(music|song|melody|score)/i.test(m.overview) ||
      /96|aruvi|jigarthanda/i.test(m.title)
  },
  {
    key: "village",
    question: "Which movie is set in a Tamil village?",
    find: ms => ms.find(m =>
      /(village|rural|countryside|farmer|silambam)/i.test(m.overview) || /pariyerum|subramaniapuram/i.test(m.title)
    ),
    isCorrect: m =>
      /(village|rural|countryside|farmer|silambam)/i.test(m.overview) || /pariyerum|subramaniapuram/i.test(m.title),
  },
  {
    key: "social",
    question: "Which movie deals with social issues or caste?",
    find: ms => ms.find(m =>
      /(caste|social|issue|education|oppression|society)/i.test(m.overview) || /pariyerum|aruvi/i.test(m.title)
    ),
    isCorrect: m =>
      /(caste|social|issue|education|oppression|society)/i.test(m.overview) || /pariyerum|aruvi/i.test(m.title),
  },
  {
    key: "femaleLead",
    question: "Which movie has a notable female lead character?",
    find: ms => ms.find(m => /(woman|girl|female|lead|protagonist|heroine)/i.test(m.overview) || /aruvi/i.test(m.title)),
    isCorrect: m => /(woman|girl|female|lead|protagonist|heroine)/i.test(m.overview) || /aruvi/i.test(m.title),
  }
];

// Helper: shuffle an array.
function shuffle(arr) {
  return arr.map(a => [a, Math.random()]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}

function MovieBingo({ onBackToDashboard }) {
  // GAME STATE
  const N = 9; // grid size (3x3)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]); // 9 unique movie objects
  const [questions, setQuestions] = useState([]); // 9 {question, find, checker}
  const [round, setRound] = useState(0); // 0..8
  const [lockedCellIdx, setLockedCellIdx] = useState(null);
  const [feedbackStates, setFeedbackStates] = useState([]); // [{clicked: idx, correctIdx: idx, status:'correct'|'wrong'}...]
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Robust bootstrap logic for TMDB and fallbacks.
  useEffect(() => {
    let isMounted = true;
    async function start() {
      setError("");
      setLoading(true);
      setQuizCompleted(false);
      setLockedCellIdx(null);
      setFeedbackStates([]);
      setRound(0);
      // 1. Fetch unique movies, robust fallback if fails.
      let bingoMovies = [];
      try {
        bingoMovies = await fetchUniqueKollywoodMovies(N);
        if (!bingoMovies || bingoMovies.length < N)
          throw new Error("Not enough unique TMDB movies");
      } catch (e) {
        // fallback
        bingoMovies = fallbackMoviesList();
        setError("Live TMDB data unavailable. Using fallback movie grid for this game.");
      }
      if (!isMounted) return;

      // 2. Shuffle grid & questions for fairness
      const shuffledMovies = shuffle(bingoMovies);
      const shuffledQuestions = shuffle(QUESTION_BANK).slice(0, 9);
      setMovies(shuffledMovies);
      setQuestions(shuffledQuestions);
      setLoading(false);
      setQuizCompleted(false);
      setLockedCellIdx(null);
      setFeedbackStates([]);
      setRound(0);
    }
    start();
    return () => { isMounted = false; }
  }, []);

  // Handle cell click: Only allow when not locked and on current round. Visual feedback before next round.
  function handleGridClick(idx) {
    if (loading || quizCompleted || lockedCellIdx !== null || !movies[idx]) return;
    const correctAns = questions[round].find(movies)
      || movies.find(m => questions[round].isCorrect(m));
    const correctIdx = movies.findIndex(m => m && m.id === (correctAns && correctAns.id));
    const wasCorrect = idx === correctIdx;

    setLockedCellIdx(idx);
    setFeedbackStates(prev => [
      ...prev,
      {
        round, cell: idx, status: wasCorrect ? "correct" : "wrong",
        correctIdx, chosenTitle: movies[idx].title, correctTitle: correctAns && correctAns.title, question: questions[round].question
      }
    ]);

    setTimeout(() => {
      if (round === N - 1) {
        setQuizCompleted(true);
      } else {
        setRound(round + 1);
        setLockedCellIdx(null);
      }
    }, 950); // Show color feedback before next
  }

  // On finish, compile answer/result array to match conventions
  function getResults() {
    return feedbackStates.map((f, i) => ({
      guess: f.chosenTitle,
      correct: f.correctTitle,
      wasCorrect: f.status === "correct",
      question: f.question
    }));
  }

  // UI: main render (loading, error, game, result)
  if (loading)
    return (
      <div className="container" style={{ paddingTop: 100, minHeight: 220 }}>
        Loading Movie Bingo quiz...
      </div>
    );
  if (quizCompleted)
    return (
      <QuizResult
        score={feedbackStates.filter(f => f.status === "correct").length}
        total={N}
        answers={getResults()}
        onHome={onBackToDashboard}
        game="Movie Bingo"
      />
    );
  // If a critical network/tmdb error disabled game, display fallback error immediately
  if (!!error && (!movies || !movies.length))
    return (
      <div className="container" style={{ paddingTop: 100 }}>
        <div style={{ marginBottom: 20, color: "#c61414", fontWeight: 600 }}>
          {error}
        </div>
        <button className="btn btn-large" onClick={onBackToDashboard}>⬅ Back</button>
      </div>
    );

  // --- Main grid view
  // Get current question and answer idx for highlighting
  const currQ = questions[round];
  const currAns = currQ.find(movies) || movies.find(m => currQ.isCorrect(m));
  const currCorrectIdx = movies.findIndex(m => m && currAns && m.id === currAns.id);

  // 3x3 grid
  const nCols = 3;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${nCols}, 1fr)`,
    width: 390,
    maxWidth: 500,
    margin: "0 auto",
    gap: 14,
    marginBottom: 42,
    marginTop: 17,
  };

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 30, minHeight: 480 }}>
      <button className="btn" style={{ marginBottom: 18 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      {error && (
        <div
          style={{
            margin: "12px auto 18px", color: "#ba7d02", background: "#fff8da",
            padding: "7px 24px", borderRadius: 7, maxWidth: 300, fontSize: 15, fontWeight: 500
          }}
        >
          {error}
        </div>
      )}
      <div style={{
        margin: "0 auto 20px", textAlign: "center", fontWeight: 700, fontSize: 21, color: "#19947b"
      }}>
        {`Movie Bingo — Round ${round + 1} of 9`}
      </div>
      <div
        className="description"
        style={{
          marginBottom: 16,
          fontSize: 17,
          color: "#3448c7",
          textAlign: "center",
          minHeight: 32
        }}
        aria-live="assertive"
      >
        {currQ ? currQ.question : ""}
      </div>
      {/* GRID */}
      <div style={gridStyle}>
        {movies.map((movie, idx) => {
          // Compute visual style
          let cellStatus = "";
          if (lockedCellIdx !== null) {
            if (idx === lockedCellIdx) {
              cellStatus = lockedCellIdx === currCorrectIdx ? "correct" : "wrong";
            } else if (idx === currCorrectIdx) {
              cellStatus = lockedCellIdx === currCorrectIdx ? "correct" : "";
            }
          }
          let bg = "#f8fcfe"; let border = "2.5px solid #bbf7fd";
          if (cellStatus === "correct") {
            bg = "#47f17d"; border = "3.5px solid #1ba94f";
          } else if (cellStatus === "wrong") {
            bg = "#ef5555"; border = "3.5px solid #bd232d";
          }
          return (
            <div
              key={movie.id}
              onClick={() => 
                lockedCellIdx === null && !quizCompleted ? handleGridClick(idx) : undefined
              }
              style={{
                background: bg,
                border: border,
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
                userSelect: "none",
                minHeight: 52,
                minWidth: 76,
                maxWidth: 170,
                textAlign: "center",
                cursor: lockedCellIdx !== null || quizCompleted ? "no-drop" : "pointer",
                boxShadow: cellStatus
                  ? (cellStatus === "correct"
                      ? "0 0 15px #80f0c3"
                      : "0 0 9px #e23e49")
                  : "0 2px 11px #c2eefd22",
                padding: 0,
                margin: 0,
                position: "relative",
                transition: "box-shadow .13s, background .14s, border .14s",
                opacity: quizCompleted ? 0.71 : 1,
                outline: "none",
                overflowWrap: "break-word"
              }}
              aria-label={`Movie: ${movie.title}`}
              tabIndex={lockedCellIdx === null ? 0 : -1}
            >
              <div style={{
                color: "#1865be",
                fontWeight: 700,
                fontSize: 17,
                padding: "10px 2px 2px 2px",
                lineHeight: 1.12,
                opacity: cellStatus === "wrong" ? 0.7 : 1,
                whiteSpace: "pre-wrap"
              }}>
                {movie.title}
              </div>
              <div style={{
                fontSize: 13,
                color: "#43bcae",
                opacity: 0.88,
                marginTop: 1
              }}>
                {movie.release_date ? movie.release_date.slice(0,4) : ""}
              </div>
              {cellStatus === "correct" && (
                <span
                  style={{
                    position: "absolute", right: 8, top: 6,
                    fontSize: 29, color: "#18b244", opacity: 0.8,
                  }}>✔️</span>
              )}
              {cellStatus === "wrong" && (
                <span
                  style={{
                    position: "absolute", right: 8, top: 6,
                    fontSize: 27, color: "#e02947", opacity: 0.77,
                  }}>✖️</span>
              )}
            </div>
          );
        })}
      </div>
      {lockedCellIdx !== null && (
        <div style={{
          textAlign: "center", marginTop: 18, fontWeight: 600, fontSize: 16,
          color: lockedCellIdx === currCorrectIdx ? "#009960" : "#e6332e", minHeight: 32
        }}>
          {lockedCellIdx === currCorrectIdx
            ? "🎉 Correct! Moving to next question..."
            : (
              <>
                ❌ Not correct. The correct answer was:{" "}
                <span style={{ color: "#209ff7", fontWeight: 500 }}>
                  {currAns && currAns.title}
                </span>
              </>
            )}
        </div>
      )}
      <div style={{
        marginTop: 25, textAlign: "center", color: "#b5bcc2",
        fontSize: 13.5, letterSpacing: ".09em"
      }}>
        Movies are unique and strictly Kollywood.<br />
        All data sourced LIVE from TMDB, robust fallback if needed.
      </div>
    </div>
  );
}

export default MovieBingo;
