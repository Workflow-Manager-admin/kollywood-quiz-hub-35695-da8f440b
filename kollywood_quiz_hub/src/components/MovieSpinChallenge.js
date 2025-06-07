import React, { useState, useEffect, useRef } from "react";
import QuizResult from "./QuizResult";

/**
 * MovieSpinChallenge (Real Kollywood Movie Triples Mode)
 * - Fetches pool of Kollywood movies from TMDB.
 * - Extracts only valid (Hero, Heroine, Year) triples that exist in real movies.
 * - The "spin" can only land on an authentic triple, backed by a real TMDB Kollywood film.
 * - Revealed answer is always a real movie matching the combo.
 * PUBLIC_INTERFACE
 */

// TMDB Details
const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Utility: normalize for keys
function normalize(str) {
  return (str || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// --- TMDB Fetch Helpers ---

/**
 * Fetch Kollywood movies (Tamil, by language). Grabs up to nPages*20.
 * Each movie comes as TMDB discover object.
 */
async function fetchKollywoodMoviesWithDetails(usedMovieSet = new Set(), nPages = 6) {
  let kollyMovies = [];
  let seenTitles = new Set();
  for (let page = 1; page <= nPages; ++page) {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
    let resp;
    try {
      resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const validMovies = (data.results || []).filter(
        m =>
          m &&
          m.id &&
          m.title &&
          !usedMovieSet?.has?.(normalize(m.title)) &&
          !seenTitles.has(normalize(m.title))
      );
      validMovies.forEach(m => {
        kollyMovies.push(m);
        seenTitles.add(normalize(m.title));
      });
    } catch (e) {
      continue;
    }
  }
  // Fetch full credits for each movie (limit for perf!)
  const withDetails = [];
  await Promise.all(
    kollyMovies.slice(0, 48).map(async m => {
      try {
        const detailUrl = `${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`;
        const resp = await fetch(detailUrl);
        if (resp.ok) {
          const details = await resp.json();
          if (details && details.credits && details.credits.cast && details.release_date && details.title) {
            withDetails.push({
              id: m.id,
              title: m.title,
              release_date: details.release_date,
              cast: details.credits.cast,
              poster_path: details.poster_path,
              details: details,
            });
          }
        }
      } catch {
        // skip
      }
    })
  );
  return withDetails;
}

/**
 * Given movies with cast detail, produce all possible (hero, heroine, year, movie) triples.
 * Only include ones that have all 3 values present and valid.
 * Returns: {triples: [...], tripleToMovie: {...}}
 */
function buildValidMovieTriples(movies) {
  const triples = [];
  const tripleToMovie = {};
  for (const movie of movies) {
    let hero = null, heroine = null, year = null;
    if (Array.isArray(movie.cast)) {
      // Hero: first top-4 male actor, Heroine: first top-5 female actor (loose filter)
      hero = movie.cast.find(a => a.gender === 2 && a.known_for_department === "Acting" && a.order < 4);
      heroine = movie.cast.find(a => a.gender === 1 && a.known_for_department === "Acting" && a.order < 5);
    }
    if (movie.release_date && movie.release_date.length >= 4) {
      year = movie.release_date.slice(0, 4);
    }
    if (hero && heroine && year && hero.name && heroine.name) {
      const tripleObj = {
        hero: hero.name.trim(),
        heroine: heroine.name.trim(),
        year,
        movie
      };
      triples.push(tripleObj);
      tripleToMovie[
        normalize(hero.name.trim()) + "|" +
        normalize(heroine.name.trim()) + "|" +
        year
      ] = movie;
    }
  }
  return { triples, tripleToMovie };
}

/** SpinnerWheel displays one property from the triple list (part: hero, heroine, year) */
function SpinnerWheel({ triples, spinning, onEnd, selectedIdx, label, part }) {
  const [activeIdx, setActiveIdx] = useState(selectedIdx || 0);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % triples.length);
      }, 60 + Math.random() * 18);
      return () => clearInterval(intervalRef.current);
    } else {
      setActiveIdx(selectedIdx || 0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    // eslint-disable-next-line
  }, [spinning, triples.length, selectedIdx]);
  useEffect(() => {
    if (!spinning && onEnd) onEnd(triples[activeIdx]);
    // eslint-disable-next-line
  }, [spinning]);
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", width: 120, padding: 0, margin: 0,
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "#15b6cc",
          marginBottom: 8,
          textShadow: "0 2px 8px #fff, 0 1px 0px #013",
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
          textShadow: "0 1px 7px #000, 0 1px 22px #004f847c",
          letterSpacing: ".02em",
        }}
      >
        {spinning && triples.length > 0
          ? triples[activeIdx][part]
          : triples[selectedIdx || 0]?.[part]}
      </div>
      <div style={{ height: 18 }}></div>
    </div>
  );
}

// PUBLIC_INTERFACE
function MovieSpinChallenge({ onBackToDashboard }) {
  // State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [movieTriples, setMovieTriples] = useState([]); // Only valid triples, each { hero, heroine, year, movie }
  const [tripleToMovie, setTripleToMovie] = useState({});
  const [spinning, setSpinning] = useState(false);
  const [activeSpinIdx, setActiveSpinIdx] = useState(0); // index to use for displaying
  const [finalTriple, setFinalTriple] = useState(null);
  const [showRevealPanel, setShowRevealPanel] = useState(false);

  // Fetch movies and build triple pool
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setLoadError("");
      setFinalTriple(null);
      setShowRevealPanel(false);
      try {
        const moviesWithDetails = await fetchKollywoodMoviesWithDetails(undefined, 6);
        const { triples, tripleToMovie } = buildValidMovieTriples(moviesWithDetails);
        if (triples.length < 2) {
          setLoadError("Not enough valid Kollywood (hero, heroine, year) triples fetched from TMDB.");
          setLoading(false);
          return;
        }
        if (!cancelled) {
          setMovieTriples(triples);
          setTripleToMovie(tripleToMovie);
          setLoading(false);
        }
      } catch (err) {
        setLoadError("Error while loading Kollywood movies from TMDB.");
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function handleStartSpin() {
    setShowRevealPanel(false);
    setFinalTriple(null);
    setSpinning(true);
    setTimeout(() => {
      if (movieTriples.length < 1) { setSpinning(false); return; }
      const idx = Math.floor(Math.random() * movieTriples.length);
      setActiveSpinIdx(idx);
      setFinalTriple(movieTriples[idx]);
      setSpinning(false);
    }, 2100 + Math.random() * 200);
  }

  function handleRevealAnswer() {
    setShowRevealPanel(true);
  }
  function resetGame() {
    window.location.reload();
  }

  // Panel: revealed movie for this combo
  function renderRevealPanel() {
    if (!showRevealPanel || !finalTriple) return null;
    const movie = finalTriple.movie;
    return (
      <div
        style={{
          margin: "34px auto 16px",
          padding: "19px 12px 12px 12px",
          borderRadius: 15,
          background: "#181615",
          border: "3.5px solid #fff966",
          boxShadow: "0 6px 22px #fab40075",
          maxWidth: 400,
          color: "#fff",
          fontWeight: 900,
          textAlign: "center",
          fontSize: 21,
          position: "relative",
          zIndex: 10,
        }}
      >
        <span role="img" aria-label="Reveal">🎬</span>{" "}
        <span style={{ color: "#ffe600", fontSize: 20, fontWeight: 900, textShadow: "0 1px 18px #333" }}>Correct Movie:</span>
        <br />
        {movie ? (
          <>
            <span style={{ fontSize: 24, color: "#fff", fontWeight: 900, textShadow: "0 2px 8px #ffe500,0 2px 14px #000" }}>
              {movie.title}
            </span>
            {movie.poster_path && (
              <div style={{ marginTop: 8, marginBottom: 3 }}>
                <img
                  src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                  alt={`Poster for ${movie.title}`}
                  style={{
                    width: 82,
                    height: 118,
                    borderRadius: 6,
                    border: "3px solid #ffd700",
                    boxShadow: "0 5px 21px #ffe66a, 0 1.5px 8px #fff7"
                  }}
                />
              </div>
            )}
            <div
              style={{
                margin: "10px 0 0 0",
                color: "#111",
                fontWeight: 600,
                fontSize: 16,
                background: "#fffabbf2",
                borderRadius: 6,
                padding: "8px 5px 6px 5px",
                border: "2px solid #ffe43a"
              }}
            >
              <b>Matched:</b>
              {" "}
              <span style={{ color: "#24bec9", fontWeight: 700 }}>{finalTriple.hero}</span>
              {" ● "}
              <span style={{ color: "#ffd700", fontWeight: 700 }}>{finalTriple.heroine}</span>
              {" ● "}
              <span style={{ color: "#5f24ad", fontWeight: 700 }}>{finalTriple.year}</span>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 18, color: "#ffe100", fontWeight: 700, textShadow: "0 1px 7px #00090a" }}>
            No movie found for this triple. (Should never occur)
          </span>
        )}
        <div>
          <button
            className="btn"
            style={{
              marginTop: 13,
              background: "#232663",
              color: "#fff700",
              border: "2.5px solid #ffe43c",
              fontWeight: 700,
              padding: "9px 18px",
              fontSize: "1.1rem",
              textShadow: "0 1px 13px #ffe20099, 0 2px 18px #0f0f1a",
            }}
            onClick={() => setShowRevealPanel(false)}
          >
            Hide Answer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        <div>Loading Kollywood movies &amp; real wheel options...</div>
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
        Spin the movie wheels! Every result is <b>guaranteed</b> to be a real Kollywood (Tamil) movie from TMDB—no impossible matches.
        <br />
        The triplet (Hero, Heroine, Year) you spin <b>will always correspond to an actual film</b>.
      </div>
      {/* Main spinning wheels row — all three wheels will land on the same valid triple for display sync */}
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
          triples={movieTriples}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={activeSpinIdx}
          label="Hero"
          part="hero"
        />
        <SpinnerWheel
          triples={movieTriples}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={activeSpinIdx}
          label="Heroine"
          part="heroine"
        />
        <SpinnerWheel
          triples={movieTriples}
          spinning={spinning}
          onEnd={() => {}}
          selectedIdx={activeSpinIdx}
          label="Year Released"
          part="year"
        />
      </div>
      {/* Spin button */}
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
            : finalTriple
            ? "Spin Again!"
            : "Spin Wheels!"}
        </button>
      </div>
      {/* The explicit spun combination display box (e.g., 'Your Movie Spin: ...') was removed as per requirements. */}
      {finalTriple && (
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
            disabled={spinning || showRevealPanel}
            onClick={handleRevealAnswer}
          >
            Reveal Movie
          </button>
        </div>
      )}
      {/* Revealed movie panel */}
      {renderRevealPanel()}
      <div style={{
        marginTop: 38,
        color: "#ffe800",
        fontSize: 13,
        textAlign: "center",
        textShadow: "0 1px 7px #171918, 0 3px 13px #232222"
      }}>
        All (Hero, Heroine, Year) wheel combinations are 100% guaranteed to be backed by a real Kollywood movie from TMDB.
      </div>
    </div>
  );
}

export default MovieSpinChallenge;
