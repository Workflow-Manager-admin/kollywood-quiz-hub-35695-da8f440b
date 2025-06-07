import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies, tmdbGet } from "../api/tmdb";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * PUBLIC_INTERFACE
 * MoviePropsInventory — Guess the Kollywood movie from its "prop box"
 * On mount: fetch Kollywood (Tamil) movies from TMDB (via provided fetchKollywoodMovies).
 * For each movie, assemble a prop-set (TMDB keywords or hardcoded iconic props).
 * One "prop box" is shown at a time. User enters guess. Validate (case-insensitive), give feedback, move to next.
 * Robust error handling and accessibility-minded UI.
 */
function MoviePropsInventory({ onBackToDashboard }) {
  const QUESTIONS = 8; // Shorter so prop-sets stay meaningful
  const [rounds, setRounds] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quizOver, setQuizOver] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(null); // {correct, correctTitle}

  // Some hardcoded iconic Tamil movies/props (fallback & flavor for pop culture)
  const PROPS_LIBRARY = {
    "Baasha": [
      { type: "icon", label: "Sunglasses", emoji: "🕶️" },
      { type: "icon", label: "Auto Rickshaw", emoji: "🛺" },
      { type: "icon", label: "Cuban Cigar", emoji: "🚬" }
    ],
    "Anbe Sivam": [
      { type: "icon", label: "Red Umbrella", emoji: "☂️" },
      { type: "icon", label: "Fake Beard", emoji: "🧔‍♂️" },
      { type: "icon", label: "Travel Bag", emoji: "🧳" }
    ],
    "Enthiran": [
      { type: "icon", label: "Robot", emoji: "🤖" },
      { type: "icon", label: "Wig", emoji: "💈" },
      { type: "icon", label: "Microchip", emoji: "💾" }
    ],
    "Muthu": [
      { type: "icon", label: "Horse", emoji: "🐎" },
      { type: "icon", label: "Turban", emoji: "👳‍♂️" },
      { type: "icon", label: "Palace", emoji: "🏰" }
    ],
    "Kaakha Kaakha": [
      { type: "icon", label: "Police Badge", emoji: "🔰" },
      { type: "icon", label: "Handgun", emoji: "🔫" },
      { type: "icon", label: "Shades", emoji: "🕶️" }
    ],
    "Super Deluxe": [
      { type: "icon", label: "Gun", emoji: "🔫" },
      { type: "icon", label: "Transgender Pride", emoji: "🏳️‍⚧️" },
      { type: "icon", label: "TV", emoji: "📺" }
    ],
    "Nayakan": [
      { type: "icon", label: "Trench Coat", emoji: "🧥" },
      { type: "icon", label: "Old Currency", emoji: "💵" },
      { type: "icon", label: "Slum", emoji: "🏚️" }
    ],
    // You can add more iconic ready-fallbacks if necessary.
  };

  // TMDB provides prop-related info via keywords. Fallback to overview and poster for visual prop candidate.
  async function makePropSet(movie) {
    if (!movie || !movie.id) return [];
    // 1. Hardcoded props if title matches
    if (PROPS_LIBRARY[movie.title?.trim()]) {
      return PROPS_LIBRARY[movie.title.trim()];
    }
    // 2. TMDB keywords
    try {
      // fetch movie keywords (https://developer.themoviedb.org/reference/movie-keywords)
      const kwData = await tmdbGet(`/movie/${movie.id}/keywords`, {});
      let keywords = kwData.keywords || [];
      if (!Array.isArray(keywords)) keywords = [];
      // Take most visually obvious keywords (skip too generic ones)
      const forbidden = [
        "film", "movie", "india", "kollywood", "story", "drama", "love", "man", "woman", "boy", "girl"
      ];
      const visKeywords = keywords
        .filter(
          (k) =>
            k.name.length > 3 &&
            !forbidden.some((f) => k.name.toLowerCase().includes(f))
        )
        .slice(0, 3);
      if (visKeywords.length > 0) {
        // Represent as text "props", show an icon if obvious (map 1-2 known ones)
        return visKeywords.map((k) => ({
          type: "keyword",
          label: k.name,
          emoji: guessEmojiForKeyword(k.name),
        }));
      }
    } catch (e) {
      // ignore, fallback below
    }
    // 3. Fallback: use poster (as visual prop), plus 'Release Year' prop
    const result = [];
    if (movie.poster_path) {
      result.push({
        type: "poster",
        label: "Movie Poster (prop)",
        image: `https://image.tmdb.org/t/p/w185${movie.poster_path}`,
      });
    }
    if (movie.release_date) {
      result.push({
        type: "info",
        label: `Released: ${movie.release_date.slice(0, 4)}`,
      });
    }
    // Try to extract a noun/object from overview
    if (movie.overview) {
      const object = (movie.overview.match(/\b(car|bus|ring|statue|gun|phone|letter|police|money|wedding|school|music|friend|superstar|revenge|boss|family|robot|thief|train|factory|lawyer|doctor|engineer)\b/i) || [])[0];
      if (object) {
        result.push({
          type: "keyword",
          label: object,
          emoji: guessEmojiForKeyword(object),
        });
      }
    }
    return result;
  }

  // Simple emoji-mapper for relevant prop keywords (for accessibility)
  function guessEmojiForKeyword(word) {
    const map = {
      sunglasses: "🕶️", shades: "🕶️", gun: "🔫", ring: "💍", statue: "🗿", phone: "📱",
      money: "💵", wedding: "💒", school: "🏫", police: "👮‍♂️", music: "🎶", friend: "🧑‍🤝‍🧑",
      car: "🚗", bus: "🚌", auto: "🛺", horse: "🐎", robot: "🤖", train: "🚂",
      lawyer: "⚖️", doctor: "🩺", thief: "🦹", family: "👨‍👩‍👧‍👦", boss: "💼",
      engineer: "🛠️", palace: "🏰", umbrella: "☂️"
    };
    const key = word.toLowerCase().replace(/\s/g, "");
    return map[key] || undefined;
  }

  // Quiz Initialization — build movie/prop rounds
  useEffect(() => {
    let cancelled = false;
    async function prepareRounds() {
      setLoading(true);
      setError("");
      // 1. Fetch movies, shuffle, try for diverse for prop richness
      let movies = [];
      try {
        movies = await fetchKollywoodMovies();
      } catch (e) {
        setError("Error loading TMDB Kollywood movies.");
        setLoading(false);
        return;
      }
      let pool = Array.isArray(movies) ? movies.filter(m => !!m.id && !!m.title) : [];
      // Prefer popular titles, filter obvious duds
      pool = pool.filter(m =>
        m.title &&
        typeof m.title === "string" &&
        m.title.length > 2 &&
        !["test", "untitled"].some(f => m.title.toLowerCase().includes(f))
      );
      // Place fallback iconic movies at front of pool for assurance
      Object.keys(PROPS_LIBRARY).forEach(icTitle => {
        const i = pool.findIndex(m => m.title === icTitle);
        if (i > 0) {
          // Move iconic to front for greater chance of inclusion
          const [m] = pool.splice(i, 1);
          pool.unshift(m);
        }
      });
      // Shuffle for variety
      pool = (pool || []).sort(() => 0.5 - Math.random());
      // Get top N with prop-diversity (ensure not all fallback in same game)
      const roundsArr = [];
      let tried = 0;
      for (let i = 0; i < pool.length && roundsArr.length < QUESTIONS && tried < pool.length * 2; ++i, ++tried) {
        const movie = pool[i];
        try {
          const propCandidates = await makePropSet(movie);
          if (propCandidates.length >= 1) {
            // Skip if duplicate title (avoid 2x Baasha etc)
            if (!roundsArr.some(r => r.movie.title === movie.title)) {
              roundsArr.push({ movie, props: propCandidates });
            }
          }
        } catch { }
      }
      // Fallback: ensure minimum count, fill with hardcoded if TMDB fails
      if (roundsArr.length < QUESTIONS) {
        Object.keys(PROPS_LIBRARY).forEach((title) => {
          if (
            roundsArr.length < QUESTIONS &&
            !roundsArr.some((r) => r.movie.title === title)
          ) {
            roundsArr.push({
              movie: { title: title, id: "hc-" + title, poster_path: null },
              props: PROPS_LIBRARY[title],
            });
          }
        });
      }
      setLoading(false);
      if (!cancelled) setRounds(roundsArr.slice(0, QUESTIONS));
    }
    prepareRounds();
    return () => { cancelled = true; };
  // eslint-disable-next-line
  }, []);

  // Answer handler (on submit)
  function handleSubmit(e) {
    e.preventDefault();
    if (quizOver || !rounds[step]) return;
    // Case-insensitive comparison, accept loose match (extra whitespace)
    const guess = (input || "").trim();
    const correctTitle = rounds[step].movie.title;
    const wasCorrect = guess.toLowerCase() === (correctTitle || "").toLowerCase();
    setShowAnswerFeedback({ correct: wasCorrect, correctTitle });
    setUserAnswers((prev) => [
      ...prev,
      {
        guess,
        correct: correctTitle,
        wasCorrect,
      }
    ]);
    setReveal(false);
    setTimeout(() => {
      setShowAnswerFeedback(null);
      setInput("");
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1350);
  }

  /** PUBLIC_INTERFACE — Reveal answer/give up for current round */
  function handleReveal() {
    setReveal(true);
    setShowAnswerFeedback({ correct: false, correctTitle: rounds[step].movie.title });
    setUserAnswers((prev) => [
      ...prev,
      {
        guess: "", correct: rounds[step].movie.title, wasCorrect: false, revealed: true
      }
    ]);
    setTimeout(() => {
      setShowAnswerFeedback(null);
      setInput("");
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // Visual for the prop "box" (props: [{type, label, emoji/image}][])
  function renderPropBox(propsArr) {
    if (!propsArr || propsArr.length < 1) return null;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
          marginTop: 18,
          marginBottom: 17,
        }}
        aria-label="Movie props"
      >
        {propsArr.map((p, i) =>
          p.type === "poster" && p.image ? (
            // Poster treated as "prop" for fallback/visual context
            <div
              key={"poster-" + i}
              style={{
                background: "#fff",
                borderRadius: 11,
                boxShadow: "0 4px 15px #dff1fa,0 2px 8px #cdf3ff",
                padding: 8,
                minWidth: 82,
                minHeight: 124,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
              tabIndex={0}
              aria-label="Movie Poster prop"
            >
              <img
                src={p.image}
                alt={"Poster for Movie Prop"}
                style={{
                  width: 82,
                  height: 124,
                  borderRadius: 7,
                  objectFit: "cover",
                  marginBottom: 7
                }}
              />
              <div
                style={{
                  fontSize: 15,
                  color: "#222",
                  fontWeight: 600,
                  marginBottom: 1
                }}
              >
                Poster
              </div>
            </div>
          ) : (
            <div
              key={p.label + i}
              style={{
                background: "#eafeed",
                border: "2.2px solid #c8efea",
                borderRadius: 11,
                minWidth: 74,
                minHeight: 74,
                fontSize: 34,
                color: "#222",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                boxShadow: "0 2px 6px #cdf3ff33",
                padding: "7px 7px 2px 7px",
                position: "relative"
              }}
              aria-label={p.label}
              tabIndex={0}
            >
              {p.emoji &&
                <span
                  style={{ fontSize: 38, lineHeight: 1.01, marginBottom: 6 }}
                  aria-label={p.label}
                  role="img"
                >
                  {p.emoji}
                </span>
              }
              <span style={{ fontSize: 17, color: "#148965", fontWeight: 700 }}>{p.label}</span>
            </div>
          )
        )}
      </div>
    );
  }

  if (loading)
    return (
      <div className="container" style={{ paddingTop: 110 }}>
        Loading movie props quiz...
      </div>
    );
  if (error)
    return (
      <div className="container" style={{ paddingTop: 110, color: "#b12025", fontWeight: 700 }}>
        {error}
        <br />
        <button className="btn" style={{ marginTop: 20 }} onClick={onBackToDashboard}>⬅ Back to Dashboard</button>
      </div>
    );
  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter((a) => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Movie Props Inventory"
      />
    );
  if (!rounds[step]) return null;

  // UI: Show quiz for current round
  return (
    <div className="container" style={{ paddingTop: 95, maxWidth: 480, marginBottom: 30 }}>
      <button className="btn" style={{ marginBottom: 20 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />

      <h2 className="title" style={{ fontSize: "1.5rem", marginBottom: 17, color: "#21737a" }}>
        Movie Props Inventory
      </h2>
      <div className="description" style={{ marginBottom: 17 }}>
        A box of <b>props</b> from a Kollywood (Tamil) movie is shown below.<br />
        <span style={{ color: "#18893a" }}>
          Can you guess the movie? Type the title below—it’s not case-sensitive!
        </span>
      </div>
      {/* Prop Box */}
      {renderPropBox(rounds[step].props)}

      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 13, textAlign: "center" }}
        autoComplete="off"
        aria-label="Guess movie by props"
      >
        <input
          type="text"
          placeholder="Your Guess (movie title)"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
          disabled={reveal || !!showAnswerFeedback}
          style={{
            padding: "12px",
            width: 200,
            borderRadius: 4,
            border: "1.5px solid #afe1dc",
            fontSize: "1.01rem",
            marginRight: 10,
            marginBottom: 4,
            background: reveal ? "#eee" : "#fff",
            color: "#244"
          }}
          aria-label="Enter movie name"
        />
        {!reveal && !showAnswerFeedback && (
          <button className="btn btn-large" type="submit" style={{ background: "#00eace", color: "#111" }}>
            Submit
          </button>
        )}
      </form>
      <div style={{ marginBottom: 11 }}>
        <button
          type="button"
          className="btn"
          style={{ background: "#ffe14d", color: "#432", marginLeft: 3 }}
          onClick={handleReveal}
          disabled={reveal || showAnswerFeedback}
        >
          Reveal Answer
        </button>
      </div>

      {/* Feedback area (after submit/reveal) */}
      {showAnswerFeedback && (
        <div
          style={{
            marginTop: 18,
            marginBottom: 6,
            fontWeight: 800,
            fontSize: 17,
            color: showAnswerFeedback.correct ? "#10bd44" : "#d94731",
            letterSpacing: ".02em"
          }}
          aria-live="assertive"
        >
          {showAnswerFeedback.correct
            ? <>✔️ Correct! The movie was: <span style={{ color: "#0b7271" }}>{showAnswerFeedback.correctTitle}</span></>
            : <>✖️ Not correct. {reveal ? "" : <>The answer: <span style={{ color: "#0b7271" }}>{showAnswerFeedback.correctTitle}</span></>}</>
          }
        </div>
      )}
      <div style={{ color: "#788", fontSize: 13, marginTop: 13 }}>
        Movie and prop data from TMDB and pop culture. Props may be shown as emojis, text, or icons.
      </div>
    </div>
  );
}

export default MoviePropsInventory;
