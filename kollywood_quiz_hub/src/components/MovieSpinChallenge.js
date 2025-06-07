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
  // Ensure high text contrast in wheels:
  // Label = blue shade (kept), value = pure white with strong shadow if needed
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
          textShadow: "0 2px 8px #fff, 0 1px 0px #013", // subtle light halo
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 105,
          height: 70,
          borderRadius: 22,
          background: "#0C2E40",
          border: "2.5px solid var(--base-light)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          boxShadow: "0 5px 30px #031d2827",
          textAlign: "center",
          marginBottom: 4,
          userSelect: "none",
          color: "#fff",
          textShadow: "0 1px 7px #000, 0 1px 22px #004f847c", // strong shadow for white text on blue bg
          letterSpacing: ".02em",
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

  // --- Reveal Answer feature state ---
  const [revealMovie, setRevealMovie] = useState(null);
  const [showRevealHighlight, setShowRevealHighlight] = useState(false);

  // Handler: Reveal the correct movie for current combo (find and highlight in UI)
  function handleRevealAnswer() {
    if (!finalCombo) return;
    const match = checkComboMatch(finalCombo, movies);
    setRevealMovie(match || null);
    setShowRevealHighlight(true);
    setShowResult(false);
    setFeedback("");
    setMatchingMovie(match || null);
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

  // Highlighted reveal panel for visual clarity
  function renderRevealPanel() {
    if (!finalCombo || !showRevealHighlight) return null;
    // If revealMovie is null, no such combo match exists
    return (
      <div style={{
        margin: "34px auto 16px",
        padding: "19px 12px 12px 12px",
        borderRadius: 15,
        background: "#ffd127",
        border: "3.5px solid #fe2e2e",
        boxShadow: "0 6px 22px #fab40075",
        maxWidth: 370,
        color: "#2c1805",
        fontWeight: 900,
        textAlign: "center",
        fontSize: 21,
        position: "relative",
        zIndex: 10,
      }}>
        <span role="img" aria-label="Reveal">🎬</span>{" "}
        <span style={{ color: "#b90613", fontSize: 19, fontWeight: 900 }}>Correct Movie:</span>
        <br />
        {revealMovie ? (
          <>
            <span style={{ fontSize: 23, color: "#201582", fontWeight: 900, textShadow: "0 2px 8px #ffe5a2" }}>
              {revealMovie.title}
            </span>
            {revealMovie.fullDetails && revealMovie.fullDetails.poster_path && (
              <div style={{ marginTop: 8, marginBottom: 3 }}>
                <img
                  src={`https://image.tmdb.org/t/p/w185${revealMovie.fullDetails.poster_path}`}
                  alt={`Poster for ${revealMovie.title}`}
                  style={{
                    width: 82,
                    height: 118,
                    borderRadius: 6,
                    border: "3px solid #ad46e8",
                    boxShadow: "0 5px 21px #cdba4f, 0 1.5px 8px #fff7"
                  }}
                />
              </div>
            )}
            <div style={{
              margin: "10px 0 0 0", color: "#222", fontWeight: 600, fontSize: 15.5,
              background: "#ffffffcc", borderRadius: 6, padding: "8px 5px 6px 5px",
              border: "1px solid #ffe43a"
            }}>
              <b>Matched:</b>
              {" "}
              <span style={{ color: "#24bec9" }}>{finalCombo.actor}</span>
              {" ● "}
              <span style={{ color: "#ffd700" }}>{finalCombo.genre}</span>
              {" ● "}
              <span style={{ color: "#5f24ad" }}>{finalCombo.location}</span>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 18, color: "#b6001f" }}>
            No Kollywood movie from the grid matches <b>all three</b> of:<br />
            <span style={{ color: "#24bec9" }}>{finalCombo.actor}</span> |{" "}
            <span style={{ color: "#ffd700" }}>{finalCombo.genre}</span> |{" "}
            <span style={{ color: "#5f24ad" }}>{finalCombo.location}</span>
          </span>
        )}
        <div>
          <button
            className="btn"
            style={{
              marginTop: 13,
              background: "#171e3b", color: "#ffd500",
              border: "2px solid #ffd139", fontWeight: 700,
              padding: "9px 18px", fontSize: "1.08rem"
            }}
            onClick={() => {
              setShowRevealHighlight(false);
              setRevealMovie(null);
            }}
          >
            Hide Answer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 36 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <h2 className="title" style={{
        fontSize: "2.1rem",
        marginBottom: 13,
        color: "#fff",
        textShadow: "0 3px 18px #020c22",
      }}>
        Movie Spin Challenge
      </h2>
      <div className="description" style={{
        marginBottom: 17,
        color: "#ffe43c",
        fontWeight: 600,
        textShadow: "0 1px 8px #222, 0 1px 12px #6464649c",
      }}>
        Spin three wheels to get a Kollywood <b>Actor</b>, <b>Genre</b>, and <b>Location</b>.
        Can you create or guess a Tamil movie that matches <b>all three</b>?<br />
        <span style={{ color: "#fff", fontWeight: 400 }}>We'll check using TMDB data for only new, unused Kollywood movies!</span>
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
              ? "#fec300"
              : "var(--base-light)",
            color: spinning ? "#222" : "#fff",
            fontWeight: 700,
            fontSize: 19,
            textShadow: "0 2px 18px #222, 0 1.5px 8px #fff7",
            pointerEvents: spinning ? "none" : "auto",
            border: spinning ? "2.5px solid #ffa800" : "",
            letterSpacing: ".03em"
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
            background: "#232323",
            color: "#fff",
            borderRadius: 12,
            padding: "23px 8px 9px 8px",
            textAlign: "center",
            fontWeight: 700,
            margin: "7px auto 0",
            fontSize: 19,
            maxWidth: 420,
            marginBottom: 18,
            boxShadow: "0 0 19px #28282a77",
            textShadow: "0 1px 11px #000, 0 2px 22px #2227",
            border: "2.2px solid var(--base-light)",
          }}
        >
          <span>
            <span style={{ color: "#ffe442", fontWeight: 800 }}>Your Movie Spin:</span>{" "}
            <span style={{
              color: "#24bec9", background: "#14232e", borderRadius: 7, padding: "2.5px 8px", margin: "0 2px",
              fontWeight: 700, textShadow: "0 2px 10px #013, 0 1px 18px #1605"
            }}>
              {finalCombo.actor}
            </span>
            {" | "}
            <span style={{
              color: "#ffd700", background: "#524000", borderRadius: 7, padding: "2.5px 8px", margin: "0 2px",
              fontWeight: 700, textShadow: "0 2px 13px #b36d05, 0 1px 18px #0008"
            }}>
              {finalCombo.genre}
            </span>
            {" | "}
            <span style={{
              color: "#fff", background: "#5f24ad", borderRadius: 7, padding: "2.5px 8px", margin: "0 2px",
              fontWeight: 700, textShadow: "0 2px 11px #29014f, 0 1px 17px #2e0145"
            }}>
              {finalCombo.location}
            </span>
            <br />
            <span style={{ color: "#ffe43c", textShadow: "0 0 8px #000d" }}>
              Enter a Kollywood movie that matches <b>all three</b>, or try to invent one.&nbsp;
            </span>
          </span>
        </div>
      )}
      {finalCombo && (
        <div style={{ textAlign: "center", marginBottom: 16, marginTop: -9 }}>
          <button
            className="btn btn-large"
            style={{
              background: "#ffe13e",
              color: "#752019",
              border: "2.2px solid #daba00",
              fontWeight: 800,
              boxShadow: "0 1px 12px #ffe00044",
              padding: "10px 24px",
              fontSize: "1.09rem"
            }}
            disabled={spinning || showRevealHighlight}
            onClick={handleRevealAnswer}
          >
            Reveal Answer
          </button>
        </div>
      )}
      {/* Revealed answer panel */}
      {renderRevealPanel()}
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
              border: "2.5px solid var(--base-light)",
              marginBottom: 8,
              marginRight: 9,
              background: "#13152d",
              color: "#fff",
              fontWeight: 600,
              textShadow: "0 1px 8px #020c22",
              letterSpacing: ".01em",
              outline: "none",
              boxShadow: "0 0 9px #15175e55",
            }}
          />
          <button
            type="submit"
            className="btn btn-large"
            style={{
              background: "#ffe62c",
              color: "#181207",
              fontWeight: 800,
              letterSpacing: ".04em",
              border: "2.2px solid #e9a500",
              textShadow: "0 1px 6px #ffe15288, 0 4px 16px #fff15b33",
              pointerEvents: spinning ? "none" : "auto",
              boxShadow: "0 2px 8px #fffae7, 0 1.5px 10px #ffe93c44",
              marginLeft: 4,
              marginTop: -3,
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
          fontWeight: 800,
          fontSize: 17,
          minHeight: 22,
          textAlign: "center",
          color: feedback.startsWith("✅") ? "#fff" : "#fff",
          background: feedback.startsWith("✅") ? "#1f5f2e" : "#b31322",
          borderRadius: 10,
          boxShadow: "0 2px 14px #1d182830",
          padding: "16px 6px 12px 6px",
          textShadow: feedback.startsWith("✅")
            ? "0 1.5px 10px #13e87a, 0 2px 18px #000c"
            : "0 2px 10px #a80321, 0 6px 12px #fff3",
          letterSpacing: ".018em"
        }}>
          {feedback}
          {matchingMovie && (
            <div style={{
              marginTop: 16,
              color: "#ffe63c",
              fontSize: 19,
              textShadow: "0 1px 11px #b08d08, 0 2px 15px #262101",
              fontWeight: 700,
            }}>
              <b>✓ Example match:</b>
              <br />
              <span style={{
                color: "#fff", fontWeight: 900,
                textShadow: "0 1px 11px #37b5ec,0 2px 9px #3aaad8a7"
              }}>
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
                    border: "2.5px solid #b7ecf5",
                  }}
                />
              )}
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <button
              className="btn"
              onClick={resetGame}
              style={{
                marginRight: 10,
                background: "#1871ad",
                color: "#fff",
                fontWeight: 700,
                border: "2px solid #5eb3f1",
                textShadow: "0 2px 12px #0063b4, 0 1px 18px #c8eaff55",
              }}>
              Play Again
            </button>
            <button
              className="btn"
              onClick={onBackToDashboard}
              style={{
                background: "#272b2f",
                color: "#ffe800",
                fontWeight: 700,
                marginLeft: 6,
                border: "2px solid #b8ad38",
                textShadow: "0 1px 10px #17180b, 0 0px 18px #fff13d44"
              }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
      <div style={{
        marginTop: 38,
        color: "#ffe800",
        fontSize: 13,
        textAlign: "center",
        textShadow: "0 1px 7px #171918, 0 3px 13px #232222"
      }}>
        Data &copy; TMDB. Only unused Kollywood movies are included in each play—once you match a movie, it vanishes from future spins!
      </div>
    </div>
  );
}

export default MovieSpinChallenge;
