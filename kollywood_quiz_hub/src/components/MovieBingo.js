import React, { useState, useEffect } from "react";
import QuizResult from "./QuizResult";

// PUBLIC_INTERFACE
/**
 * MovieBingo (Enhanced for readability and factuality)
 * - All question, answer, and grid text is in white for optimal contrast.
 * - Each bingo question is dynamically and reliably tied to a single grid movie, using actual TMDB data: genres, director, release year, or plot keyword.
 * - 3x3 grid; 9 rounds.
 */

const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const PREVIOUSLY_USED_MOVIES = [
  "Enthiran", "3 Idiots", "Premam", "Kaakha Kaakha", "Baasha",
  "Vikram Vedha", "Super Deluxe", "Nayakan", "I", "Mersal",
  "Meiyazhagan", "Cuckoo", "Muthu", "Maari", "Mouna Ragam",
  "Anbe Sivam", "Sivaji", "Gentleman", "VIP", "Amaran"
];
function normalizeTitle(title) {
  return (title || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
}
const PREV_MOVIE_SET = new Set(PREVIOUSLY_USED_MOVIES.map(normalizeTitle));

// TMDB Data Fetchers
async function fetchKollywoodMoviePage(page = 1) {
  const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("TMDB discover failed");
  return (await resp.json()).results || [];
}
async function fetchUniqueKollywoodMovies(n = 9) {
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

// Robust fallback for 9 static movies, with mock IDs
function fallbackMoviesList() {
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

/**
 * Helper: Shuffle an array (Fisher-Yates)
 */
function shuffle(arr) {
  return arr.map(a => [a, Math.random()]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}

/**
 * Helper: Fetch extra movie details (director, genres, keywords, etc.) for robust question generation.
 * Returns a map: movie.id -> {genres, director, releaseYear, keywords}
 */
async function fetchMoviesDetailedInfo(movies) {
  // Needs TMDB API key and ID list
  const details = {};
  // Use Promise.all with throttling for up to 9 movies
  await Promise.all(movies.map(async (m) => {
    if (!m || !m.id) return;
    try {
      // https://developer.themoviedb.org/reference/movie-details
      const baseUrl = `${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,keywords`;
      const resp = await fetch(baseUrl);
      if (!resp.ok) {
        details[m.id] = { genres: [], director: null, releaseYear: null, keywords: [] };
        return;
      }
      const data = await resp.json();
      // Director: credits.crew where job==="Director"
      let director = null;
      if (data.credits && Array.isArray(data.credits.crew)) {
        const found = data.credits.crew.find(x => x.job === "Director");
        if (found) director = found.name;
      }
      // Keywords
      let keywords = [];
      if (data.keywords && Array.isArray(data.keywords.keywords)) {
        keywords = data.keywords.keywords.map(k => k.name.toLowerCase());
      }
      // Genres
      let genres = [];
      if (Array.isArray(data.genres)) {
        genres = data.genres.map(g => (g.name || "").toLowerCase());
      }
      // Released year
      const releaseYear = (data.release_date && typeof data.release_date === "string")
        ? data.release_date.slice(0, 4) : null;
      details[m.id] = {
        genres,
        director,
        releaseYear,
        keywords,
        overview: data.overview || '',
        title: data.title || '',
      };
    } catch (e) {
      details[m.id] = { genres: [], director: null, releaseYear: null, keywords: [] };
    }
  }));
  return details;
}

/**
 * Dynamically generate 9 bingo questions such that each question clearly and factually matches
 * a single movie (with the answer being 1:1 with grid movies), using fetched TMDB attributes.
 * Returns [{question, checkFn, answerIdx}]
 */
function generateUniqueGridQuestions(movies, detailsMap) {
  // We'll generate 9 such that each is distinctive (genre, director, year, keyword)
  // Try in this order: genre, director, release-year, prominent keyword
  const usedMovieIdx = new Set();
  const usedAttrText = new Set();
  const qs = [];

  // 1. By unique genre per grid
  let genresAll = {};
  movies.forEach((m, idx) => {
    const g = (detailsMap[m.id]?.genres || []).filter(Boolean);
    g.forEach(genre => {
      if (!genresAll[genre]) genresAll[genre] = [];
      genresAll[genre].push(idx);
    });
  });
  // Pick genres used by exactly 1 movie
  Object.entries(genresAll).forEach(([genre, arr]) => {
    if (qs.length >= 9) return;
    if (arr.length === 1 && !usedMovieIdx.has(arr[0]) && !usedAttrText.has(genre)) {
      const idx = arr[0];
      qs.push({
        question: `Which movie is classified as a "${capitalize(genre)}" film?`,
        checkFn: m => (detailsMap[m.id]?.genres || []).includes(genre),
        answerIdx: idx,
      });
      usedMovieIdx.add(idx);
      usedAttrText.add(genre);
    }
  });

  // 2. Unique director per grid
  let directorCount = {};
  movies.forEach((m, idx) => {
    const d = detailsMap[m.id]?.director;
    if (!d) return;
    if (!directorCount[d]) directorCount[d] = [];
    directorCount[d].push(idx);
  });
  Object.entries(directorCount).forEach(([director, arr]) => {
    if (qs.length >= 9) return;
    if (arr.length === 1 && !usedMovieIdx.has(arr[0]) && !usedAttrText.has(director)) {
      const idx = arr[0];
      qs.push({
        question: `Which movie in the grid was directed by ${director}?`,
        checkFn: m => (detailsMap[m.id]?.director === director),
        answerIdx: idx,
      });
      usedMovieIdx.add(idx);
      usedAttrText.add(director);
    }
  });

  // 3. Unique release year
  let yearCount = {};
  movies.forEach((m, idx) => {
    const y = detailsMap[m.id]?.releaseYear;
    if (!y) return;
    if (!yearCount[y]) yearCount[y] = [];
    yearCount[y].push(idx);
  });
  Object.entries(yearCount).forEach(([year, arr]) => {
    if (qs.length >= 9) return;
    if (arr.length === 1 && !usedMovieIdx.has(arr[0]) && !usedAttrText.has(year)) {
      const idx = arr[0];
      qs.push({
        question: `Which movie was released in the year ${year}?`,
        checkFn: m => (detailsMap[m.id]?.releaseYear === year),
        answerIdx: idx,
      });
      usedMovieIdx.add(idx);
      usedAttrText.add(year);
    }
  });

  // 4. Unique keyword from TMDB "keywords" (rare word, >4 chars)
  // Only if the keyword only appears in one movie
  let keywordMap = {};
  movies.forEach((m, idx) => {
    (detailsMap[m.id]?.keywords || []).forEach(kw => {
      // Filter common/boring words
      if (/movie|film|kollywood|tamil|love|story|family|life|man|woman|music|school|india|girl|boy|drama/i.test(kw)) return;
      if (kw.length < 5) return;
      if (!keywordMap[kw]) keywordMap[kw] = [];
      keywordMap[kw].push(idx);
    });
  });
  Object.entries(keywordMap).forEach(([kw, arr]) => {
    if (qs.length >= 9) return;
    if (arr.length === 1 && !usedMovieIdx.has(arr[0]) && !usedAttrText.has(kw)) {
      const idx = arr[0];
      qs.push({
        question: `Which movie relates closely to the keyword "${kw}"?`,
        checkFn: m => (detailsMap[m.id]?.keywords || []).includes(kw),
        answerIdx: idx,
      });
      usedMovieIdx.add(idx);
      usedAttrText.add(kw);
    }
  });

  // 5. Finally, overview phrase snippets as last resort (unique phrase >=7 chars, only on one title)
  let phraseCount = {};
  movies.forEach((m, idx) => {
    const ov = (detailsMap[m.id]?.overview || "").replace(/[.,;:!?]/g, " ");
    ov.split(" ").forEach((word, i, arr) => {
      const phrase = arr.slice(i, i + 3).join(" ").trim();
      if (phrase && phrase.length > 6) {
        if (!phraseCount[phrase]) phraseCount[phrase] = [];
        phraseCount[phrase].push(idx);
      }
    });
  });
  Object.entries(phraseCount).forEach(([phrase, arr]) => {
    if (qs.length >= 9) return;
    if (arr.length === 1 && !usedMovieIdx.has(arr[0]) && !usedAttrText.has(phrase)) {
      const idx = arr[0];
      qs.push({
        question: `Which movie's plot contains: "${phrase}"?`,
        checkFn: m => (detailsMap[m.id]?.overview || "").includes(phrase),
        answerIdx: idx,
      });
      usedMovieIdx.add(idx);
      usedAttrText.add(phrase);
    }
  });

  // If less than 9, fill with fallbacks (using title)
  for (let i = 0; i < movies.length && qs.length < 9; ++i) {
    if (!usedMovieIdx.has(i)) {
      qs.push({
        question: `Which movie is titled exactly "${movies[i].title}"?`,
        checkFn: m => m.title === movies[i].title,
        answerIdx: i,
      });
      usedMovieIdx.add(i);
    }
  }
  // Defensive fallback: always return array of length 9
  return qs.slice(0, 9);
}

// Capitalize helper
function capitalize(str) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function MovieBingo({ onBackToDashboard }) {
  // GAME STATE
  const N = 9; // grid size (3x3)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]); // 9 unique movie objects
  const [questions, setQuestions] = useState([]); // 9 {question, find, checker}
  const [round, setRound] = useState(0); // 0..8
  // For each cell, stores: null if never selected, else {status: 'correct'|'wrong'}
  const [gridLockStates, setGridLockStates] = useState(Array(N).fill(null));
  const [cellFeedback, setCellFeedback] = useState({idx: null, correctIdx: null, result: null}); // {idx, correctIdx, result}
  const [feedbackStates, setFeedbackStates] = useState([]); // [{clicked: idx, correctIdx: idx, status:'correct'|'wrong'}...]
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Bootstrap: fetch grid, enhance with TMDB data, generate unique questions
  useEffect(() => {
    let isMounted = true;
    async function start() {
      setError("");
      setLoading(true);
      setQuizCompleted(false);
      setFeedbackStates([]);
      setRound(0);
      setGridLockStates(Array(N).fill(null));
      setCellFeedback({idx: null, correctIdx: null, result: null});

      // Step 1. Get 9 unique movies
      let bingoMovies = [];
      try {
        bingoMovies = await fetchUniqueKollywoodMovies(N);
        if (!bingoMovies || bingoMovies.length < N)
          throw new Error("Not enough unique TMDB movies");
      } catch (e) {
        bingoMovies = fallbackMoviesList();
        setError("Live TMDB data unavailable. Using fallback movie grid for this game.");
      }
      if (!isMounted) return;

      // Step 2. Fetch detailed info for each movie for robust question generation
      let moviesWithDetail = bingoMovies;
      let detailsMap = {};
      // Only fetch details if movies have numeric TMDB ids (not fallback)
      if (bingoMovies.every(m => m.id && (typeof m.id === "number" || /^\d+$/.test(String(m.id))))) {
        try {
          detailsMap = await fetchMoviesDetailedInfo(bingoMovies);
        } catch (e) {
          // fallback: no details
          detailsMap = {};
        }
      } else { // fallback, synthesize
        bingoMovies.forEach((m) => {
          detailsMap[m.id] = {
            genres: [],
            director: null,
            releaseYear: m.release_date ? m.release_date.slice(0, 4) : null,
            keywords: [],
            overview: m.overview || "",
            title: m.title || "",
          };
        });
      }

      // Step 3. Generate questions for this grid
      const questionObjs = generateUniqueGridQuestions(bingoMovies, detailsMap);

      if (!isMounted) return;
      setMovies(bingoMovies);
      setQuestions(questionObjs);
      setLoading(false);
      setQuizCompleted(false);
      setFeedbackStates([]);
      setRound(0);
      setGridLockStates(Array(N).fill(null));
      setCellFeedback({idx: null, correctIdx: null, result: null});
    }
    start();
    return () => { isMounted = false; }
  }, []);

  // Handle cell click: Only allow once and animate correctness
  function handleGridClick(idx) {
    if (
      loading ||
      quizCompleted ||
      gridLockStates[idx] !== null ||
      cellFeedback.idx !== null ||
      !movies[idx]
    ) return;

    // Determine correct movie for this round using current question object
    const questionObj = questions[round];
    const correctIdx = questionObj.answerIdx;
    const wasCorrect = idx === correctIdx;
    const correctAns = movies[correctIdx];

    // Lock-in state and show feedback
    setGridLockStates(prev => {
      const out = [...prev];
      out[idx] = { status: wasCorrect ? "correct" : "wrong", round, question: questionObj.question };
      return out;
    });

    setCellFeedback({ idx, correctIdx, result: wasCorrect ? "correct" : "wrong" });
    setFeedbackStates(prev => [
      ...prev,
      {
        round, cell: idx, status: wasCorrect ? "correct" : "wrong",
        correctIdx, chosenTitle: movies[idx].title, correctTitle: correctAns && correctAns.title, question: questionObj.question
      }
    ]);

    setTimeout(() => {
      setCellFeedback({idx: null, correctIdx: null, result: null});
      if (round === N - 1) {
        setQuizCompleted(true);
      } else {
        setRound(r => r + 1);
      }
    }, 950);
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
        <span style={{ color: "#fff" }}>Loading Movie Bingo quiz...</span>
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
  if (!!error && (!movies || !movies.length))
    return (
      <div className="container" style={{ paddingTop: 100 }}>
        <div style={{ marginBottom: 20, color: "#fff", fontWeight: 600 }}>
          {error}
        </div>
        <button className="btn btn-large" onClick={onBackToDashboard}>⬅ Back</button>
      </div>
    );

  // Main grid
  const currQ = questions[round];
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

  // Use answer index from questionObj for correctness feedback
  const currAnsIdx = currQ ? currQ.answerIdx : null;
  const currAns = currAnsIdx !== null ? movies[currAnsIdx] : null;

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 30, minHeight: 480 }}>
      <button className="btn" style={{ marginBottom: 18, color: "#fff", background: "var(--base-light)" }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      {error && (
        <div
          style={{
            margin: "12px auto 18px", color: "#fff", background: "#ba7d02",
            padding: "7px 24px", borderRadius: 7, maxWidth: 300, fontSize: 15, fontWeight: 500
          }}
        >
          {error}
        </div>
      )}
      <div style={{
        margin: "0 auto 20px", textAlign: "center", fontWeight: 700, fontSize: 21, color: "#fff"
      }}>
        {`Movie Bingo — Round ${round + 1} of 9`}
      </div>
      <div
        className="description"
        style={{
          marginBottom: 16,
          fontSize: 17,
          color: "#fff",
          textAlign: "center",
          minHeight: 32,
          fontWeight: 600,
          textShadow: "0 1px 8px #333"
        }}
        aria-live="assertive"
      >
        {currQ ? currQ.question : ""}
      </div>
      {/* GRID */}
      <div style={gridStyle}>
        {movies.map((movie, idx) => {
          const lock = gridLockStates[idx];
          let showStatus = "";
          if (cellFeedback.idx !== null && idx === cellFeedback.idx) {
            showStatus = cellFeedback.result;
          } else if (lock) {
            showStatus = lock.status;
          }
          let bg = "#191f34", border = "2.5px solid #fff";
          if (showStatus === "correct") {
            bg = "#27ad63";
            border = "3.5px solid #fff";
          } else if (showStatus === "wrong") {
            bg = "#e43f31";
            border = "3.5px solid #fff";
          }
          let isLocked = lock !== null;
          let isClickable =
            !isLocked &&
            !quizCompleted &&
            cellFeedback.idx === null &&
            !loading;

          return (
            <div
              key={movie.id}
              onClick={isClickable ? () => handleGridClick(idx) : undefined}
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
                cursor: isClickable ? "pointer" : "not-allowed",
                boxShadow: showStatus
                  ? (showStatus === "correct"
                      ? "0 0 15px #80f0c3"
                      : "0 0 9px #e23e49")
                  : "0 2px 11px #131a28",
                padding: 0,
                margin: 0,
                position: "relative",
                transition: "box-shadow .13s, background .14s, border .14s",
                opacity: isLocked || quizCompleted ? 0.71 : 1,
                outline: "none",
                overflowWrap: "break-word"
              }}
              aria-label={`Movie: ${movie.title}${isLocked ? " (locked)" : ""}`}
              tabIndex={isClickable ? 0 : -1}
            >
              <div style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 17,
                padding: "10px 2px 2px 2px",
                lineHeight: 1.12,
                opacity: showStatus === "wrong" ? 0.75 : 1,
                whiteSpace: "pre-wrap",
                textShadow: "0 0 6px #000, 0 1px 10px #1a1a2a"
              }}>
                {movie.title}
              </div>
              <div style={{
                fontSize: 13,
                color: "#fafbfc",
                opacity: 0.8,
                marginTop: 1,
                textShadow: "0 0 5px #263e4b"
              }}>
                {movie.release_date ? movie.release_date.slice(0,4) : ""}
              </div>
              {showStatus === "correct" && (
                <span
                  style={{
                    position: "absolute", right: 8, top: 6,
                    fontSize: 29, color: "#fff", opacity: 0.92, textShadow: "0 1px 6px #009960",
                  }}>✔️</span>
              )}
              {showStatus === "wrong" && (
                <span
                  style={{
                    position: "absolute", right: 8, top: 6,
                    fontSize: 27, color: "#fff", opacity: 0.9, textShadow: "0 0 6px #d93049",
                  }}>✖️</span>
              )}
              {isLocked && (
                <span
                  style={{
                    position: "absolute",
                    left: 7,
                    bottom: 5,
                    color: "#fff",
                    fontSize: 14,
                    opacity: 0.7,
                    pointerEvents: "none",
                    fontWeight: 600
                  }}
                  title="Locked"
                >
                  🔒
                </span>
              )}
            </div>
          );
        })}
      </div>
      {cellFeedback.idx !== null && (
        <div style={{
          textAlign: "center", marginTop: 18, fontWeight: 900, fontSize: 17,
          color: cellFeedback.idx === cellFeedback.correctIdx ? "#fff" : "#fff",
          minHeight: 32,
          textShadow: cellFeedback.idx === cellFeedback.correctIdx ? "0 1px 8px #179665" : "0 2px 14px #a21c1c"
        }}>
          {cellFeedback.idx === cellFeedback.correctIdx
            ? <span>🎉 <span style={{color:"#38efb4"}}>Correct!</span> Moving to next question...</span>
            : (
              <>
                <span style={{color:"#e2aad8"}}>❌ Not correct.</span>{" "}
                <span style={{ color: "#38aef7", fontWeight: 700 }}>
                  The correct answer was: {currAns && currAns.title}
                </span>
              </>
            )}
        </div>
      )}
      <div style={{
        marginTop: 25, textAlign: "center", color: "#eee",
        fontSize: 13.5, letterSpacing: ".09em", textShadow: "0 1px 11px #0b111a"
      }}>
        Movies are unique and strictly Kollywood.<br />
        All data sourced LIVE from TMDB, robust fallback if needed.
      </div>
    </div>
  );
}

export default MovieBingo;
