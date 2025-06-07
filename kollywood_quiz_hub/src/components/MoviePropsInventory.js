import React, { useEffect, useState } from "react";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";
import { tmdbGet, fetchKollywoodMovies } from "../api/tmdb";

/**
 * PUBLIC_INTERFACE
 * MoviePropsInventory — Kollywood-only, 4 prop clues per movie (using TMDB or fallback), no poster or title displayed.
 * - Where possible, clues are dynamically fetched from TMDB (keywords, objects, genre, etc).
 * - Falls back to curated static emoji/icon clues if not enough TMDB info is available.
 * - Each quiz uses a unique set of movies with no repetitions per session.
 */
function MoviePropsInventory({ onBackToDashboard }) {
  // Hand-curated fallback movie prop clue set (emojis, Kollywood only)
  const FALLBACK_PROP_CLUES = [
    {
      answer: "Meiyazhagan",
      clues: [
        { emoji: "🚲", label: "Cycle" },
        { emoji: "🐍", label: "Snake" },
        { emoji: "🪣", label: "Pot" },
        { emoji: "🥔", label: "Potato" }
      ]
    },
    {
      answer: "Super Deluxe",
      clues: [
        { emoji: "🏳️‍⚧️", label: "Transgender Flag" },
        { emoji: "📺", label: "Old TV" },
        { emoji: "🥓", label: "Bacon" },
        { emoji: "⚡", label: "Thunder" }
      ]
    },
    {
      answer: "Baasha",
      clues: [
        { emoji: "🕶️", label: "Black Sunglasses" },
        { emoji: "🛺", label: "Auto Rickshaw" },
        { emoji: "🚬", label: "Cigar" },
        { emoji: "💪", label: "Strongman" }
      ]
    },
    {
      answer: "Anbe Sivam",
      clues: [
        { emoji: "☂️", label: "Red Umbrella" },
        { emoji: "🧔‍♂️", label: "Bearded Man" },
        { emoji: "🧳", label: "Travel Bag" },
        { emoji: "🦁", label: "Lion" }
      ]
    },
    {
      answer: "Enthiran",
      clues: [
        { emoji: "🤖", label: "Robot" },
        { emoji: "🔋", label: "Battery" },
        { emoji: "💃", label: "Dance" },
        { emoji: "⚡", label: "Electricity" }
      ]
    },
    {
      answer: "Muthu",
      clues: [
        { emoji: "🐎", label: "Horse" },
        { emoji: "👳‍♂️", label: "Turban" },
        { emoji: "🌧️", label: "Rain" },
        { emoji: "🏰", label: "Palace" }
      ]
    },
    {
      answer: "Nayakan",
      clues: [
        { emoji: "🧥", label: "Trench Coat" },
        { emoji: "💵", label: "Money" },
        { emoji: "🏚️", label: "Slum" },
        { emoji: "🔫", label: "Gun" }
      ]
    },
    {
      answer: "Kaakha Kaakha",
      clues: [
        { emoji: "👮‍♂️", label: "Policeman" },
        { emoji: "🚗", label: "Car" },
        { emoji: "💔", label: "Heartbreak" },
        { emoji: "🔫", label: "Gun" }
      ]
    },
    {
      answer: "Cuckoo",
      clues: [
        { emoji: "🎻", label: "Violin" },
        { emoji: "🕶️", label: "Dark Glasses" },
        { emoji: "🌅", label: "Dawn" },
        { emoji: "🦯", label: "Blind Cane" }
      ]
    },
    {
      answer: "Mouna Ragam",
      clues: [
        { emoji: "💍", label: "Ring" },
        { emoji: "👰‍♀️", label: "Bride" },
        { emoji: "🏠", label: "Home" },
        { emoji: "💔", label: "Heartbreak" }
      ]
    },
    {
      answer: "Vikram Vedha",
      clues: [
        { emoji: "🔫", label: "Pistol" },
        { emoji: "😈", label: "Villain" },
        { emoji: "👮‍♂️", label: "Cop" },
        { emoji: "🕵️‍♂️", label: "Detective" }
      ]
    }
  ];

  const QUESTIONS = 8;

  // Utility: shuffle a shallow array
  function shuffle(arr) {
    return arr
      .map(x => [x, Math.random()])
      .sort((a, b) => a[1] - b[1])
      .map(a => a[0]);
  }

  // Normalize a movie title for use as ID alternative
  function normalizeTitle(title) {
    return (title || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Extract up to 4 highly unique and concrete prop clues from TMDB movie details + keywords.
   * Each clue should maximize uniqueness for this title in the round.
   * Returns: array of { label, emoji (optional), source }
   */
  function tmdbToPropsClues(tmdbMovie, tmdbKeywordsList, otherMovieTitles = []) {
    if (!tmdbMovie) return null;
    let clues = [];
    const used = new Set();
    // 1. Gather unique TMDB keywords (ignore generic ones and ones used in other round movies)
    const BLACKLIST = [
      "tamil", "film", "movie", "love", "life", "story", "india", "man", "woman", "music", "song", "family",
      "romance", "drama", "friendship", "relationship", "marriage", "death", "revenge", "child", "time", "boy", "girl"
    ];
    let goodKw = [];
    if (Array.isArray(tmdbKeywordsList)) {
      goodKw = tmdbKeywordsList.filter(
        k =>
          typeof k.name === "string"
          && k.name.length > 2
          && !BLACKLIST.includes(k.name.toLowerCase())
          && !otherMovieTitles.some(title =>
            title.toLowerCase().includes(k.name.toLowerCase())
          )
      );
      // Penalize keywords that are also found in other pool movies' titles to boost uniqueness
    }
    // 2. Concrete objects from overview
    let objWords = [];
    if (tmdbMovie.overview) {
      // Look for known prop words in plot that are NOT in any of the other movie titles.
      const OBJ_REGEX = /\b(ring|gun|cycle|cigar|auto|robot|palace|lion|detective|flag|violin|police|bride|bag|rain|umbrella|snake|horse|pot|money|bacon|tv|electricity|trench coat|turban|slum|strongman|heartbreak|glasses|cane|car|bottle|musician|suitcase|cane|poster|sword|hammer|typewriter|train|doll|school|bus|boat|uniform|jacket|crown|phone|helmet|mask|watch|letter)\b/gi;
      let match;
      while ((match = OBJ_REGEX.exec(tmdbMovie.overview)) !== null) {
        const obj = match[1];
        // Unique wrt movie titles for this session
        if (!otherMovieTitles.some(title => title.toLowerCase().includes(obj.toLowerCase())) && !used.has(obj)) {
          objWords.push(obj);
          used.add(obj);
        }
      }
    }
    // 3. Genre (rarely unique; but use only if not in pool and not very generic)
    let genreClue = null;
    if (tmdbMovie.genres && tmdbMovie.genres.length) {
      // If this genre is not present (textually) in other movie titles for the round
      const gn = tmdbMovie.genres[0].name;
      if (!otherMovieTitles.some(title => title.toLowerCase().includes(gn.toLowerCase())) && !BLACKLIST.includes(gn.toLowerCase())) {
        genreClue = gn;
      }
    }
    // 4. Year (absolute fallback, only if not in other movies' titles or existing clues, low priority)
    let yearClue = null;
    if (tmdbMovie.release_date && tmdbMovie.release_date.length >= 4) {
      const yr = tmdbMovie.release_date.slice(0, 4);
      if (!otherMovieTitles.some(title => title.includes(yr))) {
        yearClue = yr;
      }
    }
    // --- Compose prop clues with priority: objects, keyword, genre, year ---
    // Add up to 2 unique object props
    objWords.slice(0, 2).forEach((word) => {
      clues.push({ label: word.charAt(0).toUpperCase() + word.slice(1), emoji: null, source: "object" });
    });
    // Add up to 2 high-salience keywords
    goodKw.slice(0, 2).forEach((kw) => {
      if (!used.has(kw.name)) {
        clues.push({ label: kw.name.charAt(0).toUpperCase() + kw.name.slice(1), emoji: null, source: "keyword" });
        used.add(kw.name);
      }
    });
    // Add unique genre
    if (genreClue && clues.length < 4) {
      clues.push({ label: "Genre: " + genreClue, emoji: null, source: "genre" });
      used.add(genreClue);
    }
    // Add year if necessary
    if (yearClue && clues.length < 4) {
      clues.push({ label: "Year: " + yearClue, emoji: null, source: "year" });
      used.add(yearClue);
    }
    // Remove any duplicate labels
    clues = clues.filter((cl, idx, arr) =>
      arr.findIndex(c2 => c2.label === cl.label) === idx
    );
    // If 4 are available and all are reasonably unique, keep. Otherwise, fail out for fallback.
    if (clues.length >= 4) {
      return clues.slice(0, 4);
    }
    return null;
  }

  // Promisified function: For n rounds, fetch Kollywood movies, ensure each gets 4 highly accurate prop clues using TMDB data (or curated fallback).
  // Each clue set must be highly unique to the movie given the round's movie pool.
  async function generatePropRoundsFromTMDB(numRounds) {
    try {
      // Fetch candidate Kollywood movies (double pool for flexibility)
      const allKollywood = [];
      let page = 1, seenTitles = new Set();
      while (allKollywood.length < numRounds * 2 && page <= 4) {
        const res = await tmdbGet("/discover/movie", {
          with_original_language: "ta",
          sort_by: "popularity.desc",
          page,
        });
        if (res && res.results) {
          res.results.forEach(m => {
            if (m && m.title && !seenTitles.has(m.title.trim().toLowerCase())) {
              allKollywood.push(m);
              seenTitles.add(m.title.trim().toLowerCase());
            }
          });
        }
        page += 1;
      }
      // Prepare pool and ensure all titles are unique
      const pool = shuffle(allKollywood).slice(0, numRounds * 2);
      const usedTitles = new Set();
      const rounds = [];
      // To ensure clues are specific per-movie, gather all round titles for context
      const poolTitlesLower = pool.map(m => (m?.title || "").trim().toLowerCase());
      for (let i = 0; rounds.length < numRounds && i < pool.length; ++i) {
        const movie = pool[i];
        if (!movie || !movie.id || usedTitles.has(movie.title.trim().toLowerCase())) continue;

        // Exclude this movie's title from "other" titles for clue generation
        const thisMovieTitle = movie.title.trim().toLowerCase();
        const otherRoundTitles = poolTitlesLower.filter(t => t && t !== thisMovieTitle);

        // Fetch fresh/BEST keywords and details
        let tmdbKeywordsList = [];
        let tmdbDetails = null;
        try {
          const [keywordsData, details] = await Promise.all([
            tmdbGet(`/movie/${movie.id}/keywords`),
            tmdbGet(`/movie/${movie.id}`, { append_to_response: "genres" })
          ]);
          tmdbKeywordsList = keywordsData?.keywords || [];
          tmdbDetails = {
            ...movie,
            genres: details && details.genres ? details.genres : [],
            overview: details?.overview || movie?.overview || "",
            release_date: details?.release_date || movie?.release_date || ""
          };
        } catch {}
        // Try to generate prop clues from TMDB with "movie context" for maximum uniqueness
        let clues = tmdbToPropsClues(tmdbDetails, tmdbKeywordsList, otherRoundTitles);
        // If 4 aren't available, fallback to curated set
        if (!clues || clues.length < 4) {
          const fallback = FALLBACK_PROP_CLUES.find(
            f => f.answer.toLowerCase() === movie.title.trim().toLowerCase()
          );
          if (fallback && fallback.clues && fallback.clues.length === 4) {
            clues = fallback.clues;
          } else {
            continue; // cannot construct a uniquely identifying clue set, skip
          }
        }
        usedTitles.add(thisMovieTitle);
        rounds.push({
          answer: movie.title,
          clues: clues.map(prop =>
            prop.emoji
              ? { ...prop }
              : { emoji: prop.emoji || "", label: prop.label }
          )
        });
      }
      // Only return if all clues are sufficiently unique & rounds complete
      return rounds.length >= numRounds ? rounds.slice(0, numRounds) : null;
    } catch {
      return null;
    }
  }

  // --- Used movies session tracking ---
  const [usedMovies, setUsedMovies] = useState([]);
  // MAIN ROUNDS GENERATION (prefer TMDB, fallback to curated static)
  const [quizRounds, setQuizRounds] = useState(null);
  const [tmdbMode, setTmdbMode] = useState(false);
  const [step, setStep] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(null); // {correct, correctTitle}
  const [reveal, setReveal] = useState(false);
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track used movies for the current session/game.
  // Reset it on complete replay or game start.
  useEffect(() => {
    let cancelled = false;
    // Try TMDB-based rounds first for max accuracy/uniqueness
    async function bootstrap() {
      setLoading(true);
      setTmdbMode(false);
      setUsedMovies([]); // Reset used movies array on new game start
      setStep(0);
      setUserInput("");
      setUserAnswers([]);
      setShowFeedback(null);
      setReveal(false);
      setQuizOver(false);

      const tmdbRounds = await generatePropRoundsFromTMDB(QUESTIONS);
      if (!cancelled && tmdbRounds && tmdbRounds.length === QUESTIONS) {
        setQuizRounds(tmdbRounds);
        setTmdbMode(true);
        setLoading(false);
        return;
      }
      // fallback: select QUESTIONS unique hand-curated movies not already used
      let fallbackPool = shuffle(FALLBACK_PROP_CLUES);
      setQuizRounds(fallbackPool.slice(0, QUESTIONS));
      setTmdbMode(false);
      setLoading(false);
    }
    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, []);

  // Each time a round is answered or skipped (here: after submit or reveal), track movie as used.
  useEffect(() => {
    if (!quizRounds || !quizRounds[step]) return;
    // Include current as "used" if answer submitted or revealed
    // The usedMovies state is updated in handleSubmit and handleReveal below, at each advancement step.
  }, [step, quizRounds]);

  // Helper to get a unique movie key (id or title), for both TMDB & fallback
  function getMovieKey(round) {
    if (!round) return null;
    // For TMDB movies, .id may be a number or string; for fallback, use normalized .answer
    if (round.id) return String(round.id);
    return normalizeTitle(round.answer);
  }

  // PUBLIC_INTERFACE - Submission handler
  function handleSubmit(e) {
    e.preventDefault();
    if (!quizRounds || !quizRounds[step] || quizOver) return;
    const guess = (userInput || "").trim().toLowerCase();
    const correctTitle = quizRounds[step].answer;
    const wasCorrect = guess === correctTitle.toLowerCase();
    setShowFeedback({ correct: wasCorrect, correctTitle });
    setUserAnswers(prev => [
      ...prev,
      { guess, correct: correctTitle, wasCorrect }
    ]);
    setReveal(false);

    // Track movie as "used" by pushing key to state
    const key = getMovieKey(quizRounds[step]);
    setUsedMovies(prev => prev.includes(key) ? prev : [...prev, key]);

    setTimeout(() => {
      setShowFeedback(null);
      setUserInput("");
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1250);
  }

  // PUBLIC_INTERFACE - Reveal handler
  function handleReveal() {
    setReveal(true);
    const correctTitle = quizRounds[step].answer;
    setShowFeedback(null);
    setUserAnswers(prev => [
      ...prev,
      { guess: "", correct: correctTitle, wasCorrect: false, revealed: true }
    ]);
    // Track movie as "used"
    const key = getMovieKey(quizRounds[step]);
    setUsedMovies(prev => prev.includes(key) ? prev : [...prev, key]);
  }

  // ---- Utility function to get next unused round (if game logic is ever adapted for random choice) ----
  // Used for future extensibility.
  function getNextUnusedRound(rounds, usedMovieKeys) {
    for (let i = 0; i < rounds.length; ++i) {
      const key = getMovieKey(rounds[i]);
      if (!usedMovieKeys.includes(key)) return i;
    }
    return null; // All used
  }

  // --- On game replay, clear tracked arrays
  function handleRestartGame() {
    setUsedMovies([]);
    setQuizOver(false);
    setStep(0);
    setUserAnswers([]);
    setShowFeedback(null);
    setUserInput("");
    setReveal(false);
    // Force new quiz rounds regeneration
    setQuizRounds(null);
    setLoading(true);

    // Bootstrap again (simulate full reset)
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setTmdbMode(false);
      setUsedMovies([]); // Reset used movies array on new game start
      const tmdbRounds = await generatePropRoundsFromTMDB(QUESTIONS);
      if (!cancelled && tmdbRounds && tmdbRounds.length === QUESTIONS) {
        setQuizRounds(tmdbRounds);
        setTmdbMode(true);
        setLoading(false);
        return;
      }
      // fallback
      let fallbackPool = shuffle(FALLBACK_PROP_CLUES);
      setQuizRounds(fallbackPool.slice(0, QUESTIONS));
      setTmdbMode(false);
      setLoading(false);
    }
    bootstrap();
    // No need for cancel guard in restart.
  }

  // Render the prop clue box for 4 strong-styled clues (emojis or text)
  function renderPropClues(clues) {
    if (!clues || clues.length < 1) return null;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
          marginTop: 16,
          marginBottom: 24
        }}
        aria-label="Movie Prop Clues"
      >
        {clues.map((c, i) => (
          <div
            key={(c.emoji || c.label || "") + i}
            style={{
              background: "linear-gradient(120deg, #ffe54c 70%, #25b6e6 130%)",
              border: "3px solid #12cbac",
              borderRadius: 14,
              minWidth: 82,
              minHeight: 82,
              fontSize: 43,
              color: "#231d3b",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              boxShadow: "0 2px 16px #bafff484, 0 1px 34px #ffe44e45",
              padding: "13px 14px 7px 14px",
              outline: "none",
              position: "relative"
            }}
            tabIndex={0}
            aria-label={"Clue: " + (c.label || "")}
          >
            <span
              style={{
                fontSize: 54,
                lineHeight: 1.03,
                marginBottom: 3,
                textShadow: "0 2px 12px #fff9b5, 0 4px 32px #1b5c4ecc"
              }}
              aria-label={c.label}
              role="img"
            >
              {c.emoji || ""}
            </span>
            <span
              style={{
                fontSize: 18,
                color: "#164cae",
                fontWeight: 900,
                textAlign: "center",
                letterSpacing: ".02em",
                textShadow: "0 1.4px 9px #ffe84a, 0 1px 1px #fff"
              }}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (loading || !quizRounds)
    return (
      <div className="container" style={{ paddingTop: 120, color: "#ffe600" }}>
        Loading unique Kollywood movie prop clues...
      </div>
    );
  if (quizOver)
    return (
      <QuizResult
        score={userAnswers.filter(a => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        // When going home, reset the game state and used movies tracking for a new session.
        onHome={() => {
          handleRestartGame();
          onBackToDashboard();
        }}
        game="Movie Props Inventory"
      />
    );
  if (!quizRounds[step]) return null;

  return (
    <div className="container" style={{ paddingTop: 92, maxWidth: 520, marginBottom: 36 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />

      {/* Title: strong, high-visibility color */}
      <h2
        className="title"
        style={{
          fontSize: "1.42rem",
          marginBottom: 15,
          color: "#ffe600", // Bright/high-contrast yellow
          fontWeight: 900,
          textShadow: "0 2px 10px #222b, 0 0.5px 12px #ffe44ecc",
          letterSpacing: ".02em"
        }}
      >
        Movie Props Inventory
      </h2>
      <div
        className="description"
        style={{
          marginBottom: 17,
          color: "#f3ea03",
          fontWeight: 700,
          fontSize: 17,
          textShadow: "0 1.7px 8px #234"
        }}
      >
        Guess the Kollywood movie using these <span style={{ color: "#27acfa", fontWeight: 900 }}>4 prop clues</span>. Each clue is an emoji prop/icon!
      </div>
      {renderPropClues(quizRounds[step].clues)}
      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 15, textAlign: "center" }}
        autoComplete="off"
        aria-label="Guess movie by prop clues"
      >
        <input
          type="text"
          placeholder="Your Guess (movie title)"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          autoFocus
          disabled={reveal || !!showFeedback}
          style={{
            padding: "15px 10px",
            width: 235,
            borderRadius: 7,
            border: "2px solid #16d8ce",
            fontSize: "1.09rem",
            marginRight: 9,
            marginBottom: 3,
            boxShadow: "0 1px 11px #ffe46435",
            background: reveal ? "#f1f1f1" : "#fff",
            color: "#164385",
            fontWeight: 800,
            letterSpacing: ".01em",
            outline: "none"
          }}
          aria-label="Enter movie answer"
        />
        {!reveal && !showFeedback && (
          <button
            className="btn btn-large"
            type="submit"
            style={{
              background: "#ffe336",
              color: "#262",
              fontWeight: 900,
              fontSize: 16,
              boxShadow: "0 1px 10px #ffe44e44"
            }}
          >
            Submit
          </button>
        )}
      </form>
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="btn"
          style={{
            background: "#12cbac",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            marginLeft: 3,
            letterSpacing: ".01em",
            opacity: reveal ? 0.6 : 1,
            cursor: reveal ? "not-allowed" : "pointer"
          }}
          onClick={handleReveal}
          disabled={reveal || !!showFeedback}
        >
          Reveal Answer
        </button>
      </div>
      {/* Feedback area */}
      {reveal ? (
        <div
          style={{
            marginTop: 19,
            marginBottom: 11,
            fontWeight: 900,
            fontSize: 22,
            color: "#e67e00",
            textShadow: "0 1.5px 15px #fff47b,0 1.5px 12px #381b00c9",
            background: "#fffbe0",
            borderRadius: 8,
            padding: "12px 22px",
            display: "inline-block",
            letterSpacing: ".01em",
            border: "3px solid #ffe336"
          }}
          aria-live="assertive"
        >
          <span role="img" aria-label="clap">🎉</span> The answer is:&nbsp;
          <span style={{ color: "#d84a06", fontWeight: 900, fontSize: 25, textShadow: "0 1.5px 10px #feba68" }}>
            {quizRounds[step].answer}
          </span>
        </div>
      ) : showFeedback && (
        <div
          style={{
            marginTop: 19,
            marginBottom: 11,
            fontWeight: 900,
            fontSize: 20,
            color: showFeedback.correct ? "#13b63c" : "#da4f35",
            textShadow: showFeedback.correct
              ? "0 2px 9px #35fa98,0 3px 19px #33faa084"
              : "0 1.2px 3px #fde1e1,0 1.5px 9px #a13a09",
            background: showFeedback.correct ? "#f6ffd8" : "#fff1ee",
            borderRadius: 8,
            padding: "10px 16px 5px 14px",
            display: "inline-block",
            letterSpacing: ".01em"
          }}
          aria-live="assertive"
        >
          {showFeedback.correct
            ? <>✔️ <span style={{ color: "#04608c" }}>Correct!</span> The movie was: <span style={{ color: "#e3a813" }}>{showFeedback.correctTitle}</span></>
            : <>✖️ <span style={{ color: "#a43424" }}>Incorrect.</span> The answer: <span style={{ color: "#e99113" }}>{showFeedback.correctTitle}</span></>
          }
        </div>
      )}

      <div style={{ color: "#969", fontSize: 13, marginTop: 13 }}>
        All clues and answers are Kollywood. Props are selected for iconic importance. Enjoy!
      </div>
    </div>
  );
}

export default MoviePropsInventory;
