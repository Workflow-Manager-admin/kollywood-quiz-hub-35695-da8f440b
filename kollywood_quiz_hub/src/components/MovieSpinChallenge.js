import React, { useState, useEffect, useRef } from "react";
import QuizResult from "./QuizResult";

/**
 * MovieSpinChallenge: Spin 3 wheels (actor, genre, location) from unique Kollywood movies,
 * prompt user to create or guess a matching movie, validate, and show result.
 * Replaces EmojiMovieQuiz.
 * PUBLIC_INTERFACE
 */
const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// --- Helper Functions ---

function normalize(str) {
  return (str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns list of unique, "fresh" Kollywood movie objects, excluding titles in usedMovieSet.
 * @param {Set<string>} usedMovieSet Set of movie titles to exclude (normalized).
 * @param {number} n Limit on number of movies to fetch
 * @returns {Promise<Array>}
 */
async function fetchUniqueKollywoodMovies(usedMovieSet = new Set(), n = 20) {
  let found = [];
  let seen = new Set();
  let page = 1;
  let maxPages = 10;
  while (found.length < n && page <= maxPages) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) break;
      const data = await resp.json();
      const results = (data.results || []).filter(
        m =>
          m &&
          m.title &&
          !usedMovieSet.has(normalize(m.title)) &&
          !seen.has(normalize(m.title))
      );
      results.forEach(m => {
        found.push(m);
        seen.add(normalize(m.title));
      });
    } catch (e) {
      // Continue to next page
    }
    page++;
  }
  return found.slice(0, n); // Only as many as requested
}

/**
 * Returns TMDB movie details for movieId, including credits and keywords.
 * @returns {Promise<Object|null>}
 */
async function fetchMovieFullDetails(movieId) {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,keywords`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  }
}

/**
 * For a batch of movies, fetch full details (credits, keywords, genres). Picks only up to maxn.
 * @returns {Promise<Array>} Array of detailed movie objects.
 */
async function fetchMovieBatchFullDetails(movies, maxn = 20) {
  // Up to maxn movies for this round, parallelized.
  const result = [];
  await Promise.all(
    movies.slice(0, maxn).map(async (m) => {
      const d = await fetchMovieFullDetails(m.id);
      if (d && d.credits && d.genres) {
        result.push({
          ...m,
          fullDetails: d,
        });
      }
    })
  );
  return result;
}

/**
 * Extracts unique actors (top 8 billed), genres, and location keywords from batch of full-detail movies
 * Returns {actors:[], genres:[], locations:[]}
 */
function extractSpinOptions(movies) {
  const actors = new Set();
  const genres = new Set();
  const locations = new Set();
  for (const movieWithDetails of movies) {
    const det = movieWithDetails.fullDetails;
    // --- Actors ---
    if (det.credits && Array.isArray(det.credits.cast)) {
      det.credits.cast
        .slice(0, 8)
        .forEach((a) => {
          const name = a.name?.trim();
          if (name && name.length > 1) actors.add(name);
        });
    }
    // --- Genres ---
    if (det.genres && Array.isArray(det.genres)) {
      det.genres.forEach((g) => {
        if (g.name) genres.add(g.name.trim());
      });
    }
    // --- Locations: keywords (or try overviews with place clues) ---
    if (det.keywords && Array.isArray(det.keywords.keywords)) {
      det.keywords.keywords.forEach((kw) => {
        if (
          kw.name &&
          /(city|village|street|road|chennai|madurai|school|college|temple|market|court|police|hospital|station|palace|factory|port|beach|india|mall|theatre|club|park|mountain|hill|river|forest|estate|island|bridge|house|bungalow|hostel|bus stand|train|airport)/i.test(
            kw.name
          )
        ) {
          locations.add(kw.name.trim());
        }
      });
    }
    // Fallback: parse overview for common location words as well.
    if (
      det.overview &&
      /(chennai|madurai|trichy|pondicherry|kerala|village|city|school|college|hospital|temple|police station)/i.test(
        det.overview
      )
    ) {
      const matches = det.overview.match(
        /(Chennai|Madurai|Trichy|Pondicherry|Kerala|village|city|school|college|hospital|temple|police station)/gi
      );
      if (matches) matches.forEach((loc) => locations.add(loc.trim()));
    }
  }
  // Turn to arrays & shuffle for more variety
  function shuffle(arr) {
    return arr.map(a => [a, Math.random()]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
  }
  return {
    actors: shuffle(Array.from(actors)),
    genres: shuffle(Array.from(genres)),
    locations: shuffle(Array.from(locations)),
  };
}

// Checks if the combination matches any of the movies (by actor, genre, and location keyword)
function checkComboMatch(combo, movies) {
  function normalizeSet(val) {
    return (val || "").toLowerCase().trim();
  }
  return (
    movies.find((movieWithDetails) => {
      const fd = movieWithDetails.fullDetails;
      const actorOk =
        Array.isArray(fd.credits.cast) &&
        fd.credits.cast.find(
          (a) => normalizeSet(a.name) === normalizeSet(combo.actor)
        );
      const genreOk =
        Array.isArray(fd.genres) &&
        fd.genres.find(
          (g) => normalizeSet(g.name) === normalizeSet(combo.genre)
        );
      let locationOk = false;
      // Location: keyword or fallback to overview
      if (
        fd.keywords &&
        Array.isArray(fd.keywords.keywords) &&
        fd.keywords.keywords.find(
          (k) => normalizeSet(k.name) === normalizeSet(combo.location)
        )
      ) {
        locationOk = true;
      } else if (
        fd.overview &&
        normalizeSet(fd.overview).includes(normalizeSet(combo.location))
      ) {
        locationOk = true;
      }
      return actorOk && genreOk && locationOk;
    }) || null
  );
}

// --- Persistent storage for past combos (for session) ---
const STORAGE_KEY = "movieSpinPrevUsedTitles";
function getPrevUsedSet() {
  const j = window.localStorage.getItem(STORAGE_KEY);
  if (j && Array.isArray(JSON.parse(j))) {
    return new Set(JSON.parse(j).map(normalize));
  }
  return new Set();
}
function addMovieToPrevUsed(title) {
  const curr = getPrevUsedSet();
  curr.add(normalize(title));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(curr)));
}

// --- React Component ---

function SpinnerWheel({ items, spinning, onEnd, selectedIdx, label }) {
  // Visual "spinning" animation
  const [activeIdx, setActiveIdx] = useState(selectedIdx || 0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % items.length);
      }, 65 + Math.random() * 18);
      return () => clearInterval(intervalRef.current);
    } else {
      setActiveIdx(selectedIdx || 0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [spinning, items.length, selectedIdx]);
  useEffect(() => {
    if (!spinning && onEnd) onEnd(items[activeIdx]);
    // eslint-disable-next-line
  }, [spinning]);
  // Fade/scale for current
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 120,
        padding: 0,
        margin: 0,
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "#15b6cc",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 105,
          height: 70,
          borderRadius: 22,
          background: "#f6fafc",
          border: "2.5px solid var(--base-light)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 19,
          boxShadow: "0 5px 30px #96e6fe15",
          textAlign: "center",
          marginBottom: 4,
          userSelect: "none",
        }}
      >
        {spinning && items.length > 0
          ? items[activeIdx]
          : items[selectedIdx || 0]}
      </div>
      <div style={{ height: 18 }}>
        {/* Extra mini text area for bonus info */}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function MovieSpinChallenge({ onBackToDashboard }) {
  // State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [movies, setMovies] = useState([]); // pool of unique, fullData
  const [spinOptions, setSpinOptions] = useState({
    actors: [],
    genres: [],
    locations: [],
  });
  // Wheel/spinning state
  const [spinning, setSpinning] = useState(false);
  const [randomIdx, setRandomIdx] = useState({ actor: 0, genre: 0, location: 0 });
  const [finalCombo, setFinalCombo] = useState(null);
  // Guess & Results
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [matchingMovie, setMatchingMovie] = useState(null);
  const [quizOver, setQuizOver] = useState(false);

  // Needed for robust "freshness"
  const prevUsedSet = getPrevUsedSet();

  // On mount: load fresh Kollywood movies & details, extract wheels
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      setFinalCombo(null);
      setShowResult(false);
      setFeedback("");
      setMatchingMovie(null);
      let freshMovies = [];
      try {
        freshMovies = await fetchUniqueKollywoodMovies(prevUsedSet, 16);
        if (!freshMovies.length) throw new Error("No fresh Kollywood movies found.");
      } catch (e) {
        setLoadError("Failed to load movie options from TMDB.");
        setLoading(false);
        return;
      }
      // Now, fetch TMDB full details (credits, genres, keywords) for each
      let moviesWithDetails = [];
      try {
        moviesWithDetails = await fetchMovieBatchFullDetails(freshMovies, 16);
        if (!moviesWithDetails.length) throw new Error("Details fetch failed.");
      } catch (e) {
        setLoadError("Could not enrich movies with details.");
        setLoading(false);
        return;
      }
      // Now extract wheels (unique, shuffled)
      const opts = extractSpinOptions(moviesWithDetails);
      if (
        opts.actors.length < 4 ||
        opts.genres.length < 3 ||
        opts.locations.length < 2
      ) {
        setLoadError(
          "Not enough actor/genre/location wheel options. Try again later."
        );
        setLoading(false);
        return;
      }
      if (!cancelled) {
        setMovies(moviesWithDetails);
        setSpinOptions(opts);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, []);

  // --- Handle spinning wheels ---
  function handleStartSpin() {
    setSpinning(true);
    setShowResult(false);
    setMatchingMovie(null);
    setFeedback("");
    // After 2.1 seconds, stop & pick at random
    setTimeout(() => {
      const maxA = Math.max(0, spinOptions.actors.length - 1);
      const maxG = Math.max(0, spinOptions.genres.length - 1);
      const maxL = Math.max(0, spinOptions.locations.length - 1);
      // Choose random indexes for each wheel
      const a = Math.floor(Math.random() * (maxA + 1));
      const g = Math.floor(Math.random() * (maxG + 1));
      const l = Math.floor(Math.random() * (maxL + 1));
      setRandomIdx({ actor: a, genre: g, location: l });
      setSpinning(false);
      setFinalCombo({
        actor: spinOptions.actors[a],
        genre: spinOptions.genres[g],
        location: spinOptions.locations[l],
      });
      setUserInput("");
    }, 2100 + Math.random() * 280);
  }

  // --- Handle guess/create ---
  async function handleUserSubmit(e) {
    e.preventDefault();
    setFeedback("");
    setMatchingMovie(null);
    // Search: check if any movie in pool matches combo AND matches user's guess (robust)
    let comboMatch = null;
    if (finalCombo && userInput && userInput.trim()) {
      comboMatch = movies.find((movieWithDetails) => {
        const t = (movieWithDetails.title || "") + " " + (movieWithDetails.fullDetails.title || "");
        // require all 3 combo to be present in this movie
        const comboPassthrough = checkComboMatch(finalCombo, [movieWithDetails]);
        // Allow for robust title matching (ignore case/punctuation)
        const guessOk =
          normalize(t) === normalize(userInput) ||
          (userInput &&
            normalize(movieWithDetails.title).includes(normalize(userInput)));
        return comboPassthrough && guessOk;
      });
    }
    // Also, get *a* matching movie from pool that fits combo (even if not user guess)
    const fallbackAny = checkComboMatch(finalCombo, movies);

    if (comboMatch) {
      // Correct!
      setFeedback("✅ Correct! You matched all 3 wheels and guessed a real Kollywood movie!");
      setMatchingMovie(comboMatch);
      if (comboMatch.title) {
        addMovieToPrevUsed(comboMatch.title);
      }
      setQuizOver(true);
      setShowResult(true);
    } else if (fallbackAny) {
      setMatchingMovie(fallbackAny);
      setFeedback(
        "❌ There's no Kollywood movie in the list matching ALL 3 wheels and your guess, but here is a real match for inspiration:"
      );
      setQuizOver(false);
      setShowResult(true);
    } else {
      setFeedback(
        "❌ No Kollywood movie could be found that matches all 3 wheels, even with your guess. Try a different spin!"
      );
      setShowResult(true);
    }
  }

  function resetGame() {
    window.location.reload();
  }

  // --- Render UI ---
  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <div>Loading fresh Kollywood movies &amp; options for the Movie Spin Challenge...</div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <div style={{ color: "#e14747", marginBottom: 12 }}>
          {loadError}
        </div>
        <button className="btn" onClick={resetGame}>
          Retry
        </button>
        <button className="btn" style={{ marginLeft: 14 }} onClick={onBackToDashboard}>
          ⬅ Back
        </button>
      </div>
    );
  }
  if (showResult && quizOver) {
    // Final result: Show feedback and solution
    return (
      <QuizResult
        score={matchingMovie ? 1 : 0}
        total={1}
        answers={[
          {
            guess: userInput,
            correct: matchingMovie?.title || "[No exact match in pool]",
            wasCorrect: matchingMovie !== null && normalize(matchingMovie.title) === normalize(userInput),
          },
        ]}
        onHome={onBackToDashboard}
        game="Movie Spin Challenge"
      />
    );
  }

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 36 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <h2 className="title" style={{ fontSize: "2.1rem", marginBottom: 13 }}>
        Movie Spin Challenge
      </h2>
      <div className="description" style={{ marginBottom: 17 }}>
        Spin three wheels to get a Kollywood <b>Actor</b>, <b>Genre</b>, and <b>Location</b>. Can you create or guess a Tamil movie that matches <b>all three</b>? We'll check using TMDB data for only new, unused Kollywood movies!
      </div>

      {/* Main spinning-wheel row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "32px",
          justifyContent: "center",
          marginTop: 11,
        }}
      >
        <SpinnerWheel
          items={spinOptions.actors}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={randomIdx.actor}
          label="Actor"
        />
        <SpinnerWheel
          items={spinOptions.genres}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={randomIdx.genre}
          label="Genre"
        />
        <SpinnerWheel
          items={spinOptions.locations}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={randomIdx.location}
          label="Location"
        />
      </div>
      {/* Spin / re-spin button */}
      <div style={{ textAlign: "center", margin: "36px 0 14px" }}>
        <button
          className="btn btn-large"
          style={{
            background: spinning
              ? "#baf2fa"
              : "var(--base-light)",
            color: "#111",
            fontWeight: 600,
            fontSize: 18,
            pointerEvents: spinning ? "none" : "auto",
          }}
          onClick={handleStartSpin}
          disabled={spinning}
        >
          {spinning
            ? "Spinning..."
            : finalCombo
            ? "Spin Again!"
            : "Spin Wheels!"}
        </button>
      </div>
      {/* Combo challenge prompt */}
      {finalCombo && (
        <div
          style={{
            background: "#fdfaf2",
            color: "#312368",
            borderRadius: 12,
            padding: "23px 8px 9px 8px",
            textAlign: "center",
            fontWeight: 600,
            margin: "7px auto 0",
            fontSize: 19,
            maxWidth: 420,
            marginBottom: 18,
            boxShadow: "0 0 19px #e7e7fb33",
          }}
        >
          <span>
            Your Movie Spin:{" "}
            <span style={{ color: "#24bec9" }}>
              <b>{finalCombo.actor}</b>
            </span>
            {" | "}
            <span style={{ color: "#ec6400" }}>
              <b>{finalCombo.genre}</b>
            </span>
            {" | "}
            <span style={{ color: "#a10cc5" }}>
              <b>{finalCombo.location}</b>
            </span>
            <br />
            Enter a Kollywood movie that matches <b>all three</b>, or try to invent one.&nbsp;
          </span>
        </div>
      )}
      {/* User input and matching logic */}
      {finalCombo && (
        <form onSubmit={handleUserSubmit} style={{ textAlign: "center", marginBottom: 9 }}>
          <input
            type="text"
            required
            disabled={spinning}
            placeholder="Movie Title (Tamil / Kollywood only!)"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            style={{
              padding: "13px",
              minWidth: 215,
              maxWidth: 350,
              fontSize: "1.13rem",
              borderRadius: 4,
              border: "1.7px solid var(--border-color)",
              marginBottom: 8,
              marginRight: 9,
              background: spinning ? "#edeff2" : "#fff",
              color: "#333",
            }}
          />
          <button
            type="submit"
            className="btn btn-large"
            style={{
              color: "#111",
              background: "#eaffdc",
              fontWeight: 600,
              pointerEvents: spinning ? "none" : "auto",
            }}
            disabled={spinning || !userInput}
          >
            Submit Guess / Create 🎬
          </button>
        </form>
      )}
      {/* Feedback/result */}
      {showResult && (
        <div style={{
          marginTop: 24,
          color: feedback.startsWith("✅") ? "#249d24" : "#d51218",
          fontWeight: 700,
          fontSize: 16,
          minHeight: 20,
          textAlign: "center"
        }}>
          {feedback}
          {matchingMovie && (
            <div style={{ marginTop: 16, color: "#2b5451", fontSize: 17 }}>
              <b>✓ Example match:</b>
              <br />
              <span style={{ color: "#197da4", fontWeight: 600 }}>
                {matchingMovie.title}
              </span>
              {matchingMovie.fullDetails && matchingMovie.fullDetails.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w185${matchingMovie.fullDetails.poster_path}`}
                  alt={`Poster for ${matchingMovie.title}`}
                  style={{
                    marginTop: 7,
                    marginBottom: 5,
                    width: 68,
                    height: 98,
                    borderRadius: 6,
                    border: "2px solid #e3f3fa",
                  }}
                />
              )}
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={resetGame} style={{ marginRight: 10 }}>
              Play Again
            </button>
            <button className="btn" onClick={onBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
      <div style={{
        marginTop: 38,
        color: "#adadad",
        fontSize: 12,
        textAlign: "center"
      }}>
        Data &copy; TMDB. Only unused Kollywood movies are included in each play—once you match a movie, it vanishes from future spins!
      </div>
    </div>
  );
}

export default MovieSpinChallenge;
