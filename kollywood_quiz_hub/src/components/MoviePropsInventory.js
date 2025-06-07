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

  // Tries to extract 4 highly unique/strong prop clues from TMDB movie details
  // Returns [{label, emoji (sometimes), source}]
  function tmdbToPropsClues(tmdbMovie, tmdbKeywordsList) {
    // Extract genres, keywords, notable objects from overview
    if (!tmdbMovie) return null;
    let clues = [];
    // Try genres as first clue
    if (tmdbMovie.genres && tmdbMovie.genres.length) {
      clues.push({
        label: "Genre: " + tmdbMovie.genres[0].name,
        emoji: null,
        source: "genre"
      });
    }
    // Use keywords from TMDB
    if (tmdbKeywordsList && tmdbKeywordsList.length > 0) {
      // Pick only those that are concrete objects/themes, ignore generic like 'tamil', 'movie', 'love'
      const IGNORE = ["tamil", "film", "movie", "love", "life", "story", "india", "man", "woman", "music", "song", "family"];
      const goodKw = tmdbKeywordsList.filter(
        k => typeof k.name === "string" && k.name.length > 2 && !IGNORE.includes(k.name.toLowerCase())
      );
      // Pick up to 2
      goodKw.slice(0, 2).forEach(kw =>
        clues.push({
          label: "Prop: " + kw.name,
          emoji: null,
          source: "keyword"
        })
      );
    }
    // Try picking an object or visual in plot (overview)
    if (tmdbMovie.overview) {
      // Example objects to look for
      const OBJ_PATTERNS = [
        /ring|gun|cycle|cigar|auto|robot|palace|lion|detective|flag|violin|police|bride|bag|rain|umbrella|snake|horse|pot|money|bacon|tv|electricity|trench coat|turban|slum|strongman|heartbreak|glasses|cane|car|bottle|musician|suitcase/i
      ];
      const matches = tmdbMovie.overview.match(OBJ_PATTERNS[0]);
      if (matches) {
        clues.push({
          label: "Object: " + matches[0].charAt(0).toUpperCase() + matches[0].slice(1),
          emoji: null,
          source: "overview"
        });
      }
    }
    // Add release year as last resort only if not yet enough clues
    if (clues.length < 4 && tmdbMovie.release_date) {
      clues.push({
        label: "Year: " + tmdbMovie.release_date.slice(0, 4),
        emoji: null,
        source: "release"
      });
    }
    // Only return if at least 3 clues (with at least 2 unique); better fallback when <3
    // Remove repeats by label
    clues = clues.filter(
      (cl, idx, arr) => arr.findIndex(c2 => c2.label === cl.label) === idx
    );
    if (clues.length < 3) return null;
    // Add up to 4 only
    return clues.slice(0, 4);
  }

  // Promisified function: Try to fetch TMDB clues for up to n unique Kollywood movies
  // If enough clues cannot be constructed from TMDB data, fallback to curated
  async function generatePropRoundsFromTMDB(numRounds) {
    try {
      // Use up to 3 discovery pages to ensure variety
      const allKollywood = [];
      let page = 1, seenTitles = new Set();
      // Use discover first, up to 3 pages (60 movies), filter for unique titles
      while (allKollywood.length < numRounds * 2 && page <= 3) {
        // Use fetchKollywoodMovies() to get Tamil movies, but it's only 1 page; so use tmdbGet for paged
        const res = await tmdbGet("/discover/movie", {
          with_original_language: "ta",
          sort_by: "popularity.desc",
          page
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
      // Shuffle, unique up to numRounds count
      const pool = shuffle(allKollywood).slice(0, numRounds * 2); // double count for chance
      const usedTitles = new Set();
      const rounds = [];
      // For each, fetch keywords/details, generate up to 4 unique prop clues for this movie
      for (let i = 0; rounds.length < numRounds && i < pool.length; ++i) {
        const movie = pool[i];
        if (!movie || !movie.id || usedTitles.has(movie.title.trim().toLowerCase())) continue;
        // Fetch keywords and full movie details
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
        // Try to generate prop clues from TMDB data
        let clues = tmdbToPropsClues(tmdbDetails, tmdbKeywordsList);
        // If not enough, fallback to hardcoded if present for this movie's title
        if (!clues || clues.length < 3) {
          // try to find in fallback
          const fallback = FALLBACK_PROP_CLUES.find(
            f => f.answer.toLowerCase() === movie.title.trim().toLowerCase()
          );
          if (fallback) {
            clues = fallback.clues;
          } else {
            continue; // skip this movie, not enough clues!
          }
        }
        // Don't allow any movie repeats in a session
        usedTitles.add(movie.title.trim().toLowerCase());
        rounds.push({
          answer: movie.title,
          clues: clues.map(prop =>
            prop.emoji
              ? { ...prop }
              : { emoji: "", label: prop.label }
          )
        });
      }
      return rounds.length >= numRounds ? rounds.slice(0, numRounds) : null;
    } catch {
      return null; // API error, fallback
    }
  }

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

  useEffect(() => {
    let cancelled = false;
    // Try TMDB-based rounds first for max accuracy/uniqueness
    async function bootstrap() {
      setLoading(true);
      setTmdbMode(false);
      const tmdbRounds = await generatePropRoundsFromTMDB(QUESTIONS);
      if (!cancelled && tmdbRounds && tmdbRounds.length === QUESTIONS) {
        setQuizRounds(tmdbRounds);
        setTmdbMode(true);
        setLoading(false);
        return;
      }
      // fallback: select QUESTIONS unique hand-curated
      let arr = shuffle(FALLBACK_PROP_CLUES).slice(0, QUESTIONS);
      setQuizRounds(arr);
      setTmdbMode(false);
      setLoading(false);
    }
    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, []);

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
        onHome={onBackToDashboard}
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
