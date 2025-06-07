import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizResult from "./QuizResult";

// -- HELPER: Movie IDs/titles used in other games (grabbed from respective component logic)
const POSTER_QUIZ_MOVIES = [
  // Titles used in BlurredPosterQuiz (see fetch use in BlurredPosterQuiz.js)
  "Enthiran", "3 Idiots", "Premam", "Kaakha Kaakha", "Baasha", "Vikram Vedha", "Super Deluxe", "Nayakan", "I", "Mersal"
];
const CHARACTER_MATCH_MOVIES = [
  // Titles paired for character-match game (CharacterMovieMatch.js)
  "Enthiran", "Kaakha Kaakha", "Nayakan", "Meiyazhagan", "Cuckoo", "Muthu", "Maari", "Mouna Ragam", "Anbe Sivam", "Sivaji"
];
const MYSTERY_MOVIE_DETECTIVE_MOVIES = [
  // These are unknown a priori, as MysteryMovieDetective uses random Kollywood movies (by TMDB id)
  // We'll have to ignore those, except in very advanced dynamic mode (not possible without backend).
];
const EMOJI_QUIZ_MOVIES = [
  // All titles from EMOJI_MAP in EmojiMovieQuiz.js
  "Enthiran","3 Idiots","Premam","Kaakha Kaakha","Baasha","Vikram Vedha","Super Deluxe","Nayakan","I","Mersal"
];
// Build the exclusion set for maximum robustness (ID+normalized title for max exclusion)
function getUsedMovieTitleSet() {
  // Lowercase, de-space, and remove parens etc. for fuzzy exclusion
  let allTitles = [...POSTER_QUIZ_MOVIES, ...CHARACTER_MATCH_MOVIES, ...EMOJI_QUIZ_MOVIES];
  return new Set(allTitles.map(t=>
    t
      .toLowerCase()
      .replace(/[\s()\-\:\'\.,_]+/g,'')
  ));
}
function normalizeMovieTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[\s()\-\:\'\.,_]+/g,'');
}

/**
 * Movie Bingo
 * 9-cell grid with categories, lets users select matching movies.
 * PUBLIC_INTERFACE
 */
function MovieBingo({ onBackToDashboard }) {
  const BINGO_SIZE = 3;
  const [categories] = useState([
    "Time Travel",
    "Won an Award",
    "Comedy Classic",
    "Love Story",
    "Song Hit",
    "Police Story",
    "Revenge",
    "Superstar Rajini",
    "Debut Film"
  ]);
  const [movies, setMovies] = useState([]);
  const [selected, setSelected] = useState(Array(9).fill(null));
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);

  // PUBLIC_INTERFACE
  useEffect(() => {
    async function fetchAndFilterMovies() {
      setLoading(true);
      let allPages = [];
      let page = 1;
      const maxPages = 4; // Try 4 pages (80 movies) for maximal uniqueness; adjust as needed.
      try {
        for (;page <= maxPages; ++page) {
          // NOTE: Use TMDB API directly since fetchKollywoodMovies only does 1 page
          const url = `https://api.themoviedb.org/3/discover/movie?api_key=5bc67d3b06aecbd18121a3cbbc16eb59&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
          // eslint-disable-next-line no-await-in-loop
          let resp = await fetch(url);
          // Defensive check
          if (!resp.ok) break;
          // eslint-disable-next-line no-await-in-loop
          let data = await resp.json();
          if (data && Array.isArray(data.results)) {
            allPages.push(...data.results);
            if (!data.results.length) break;
          }
        }
      } catch(err) {
        // fallback to empty set, error handling below
      }
      const allMovies = allPages;
      // De-dupe by TMDB movie ID (safety)
      const byId = {};
      allMovies.forEach(m => { if (m && m.id) byId[m.id] = m; });
      let moviesPool = Object.values(byId);

      // --- Exclude all movie IDs/titles used in other games
      // By ID, for explicit demo/test mode (e.g. hardcoded ids in fallback, etc.)
      const usedTitleSet = getUsedMovieTitleSet();
      // If we had used ids (e.g. as in fallback mode in CharacterMovieMatch) could add those to a set here for more coverage

      // Exclude any movie that matches used titles in the set (fuzzy match)
      moviesPool = moviesPool.filter(m => {
        if (!m.title) return false;
        // Exclude if matches normalized title
        const norm = normalizeMovieTitle(m.title);
        return !usedTitleSet.has(norm);
      });

      // Shuffle for randomness
      const shuffled = moviesPool.sort(() => 0.5 - Math.random());

      // Bingo needs at least (9*2) = 18 titles for all select options etc.
      setMovies(shuffled.slice(0, 18));
      setLoading(false);
    }
    fetchAndFilterMovies();
  }, []);

  function handleSelect(idx, movie) {
    const next = [...selected];
    next[idx] = movie;
    setSelected(next);
  }

  function handleFinish() {
    setQuizOver(true);
  }

  if (loading) return <div className="container" style={{ paddingTop: 100 }}>Loading...</div>;
  if (quizOver)
    return (
      <QuizResult
        score={selected.filter(Boolean).length}
        total={9}
        answers={selected}
        onHome={onBackToDashboard}
        game="Movie Bingo"
      />
    );

  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <h2 className="title" style={{ fontSize: "2.2rem", marginBottom: 10 }}>
        Movie Bingo
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Click a cell, then choose a Kollywood movie from the list!
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${BINGO_SIZE}, 140px)`,
        gridTemplateRows: `repeat(${BINGO_SIZE}, 110px)`,
        gap: 12,
        margin: "0 auto",
        justifyContent: "center"
      }}>
        {categories.map((cat, idx) => (
          <div key={idx} style={{
            background: "#fafcff",
            border: "2px solid var(--base-light)",
            borderRadius: 9,
            padding: 10,
            minHeight: 60,
            textAlign: "center",
            position: "relative"
          }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#2494a8" }}>
              {cat}
            </div>
            <div>
              {selected[idx] ? (
                <div style={{ color: "#0c3", fontWeight: 600, marginTop: 3 }}>{selected[idx].title}</div>
              ) : (
                <select
                  style={{ marginTop: 9, width: "95%", borderRadius: 4, fontSize: 14 }}
                  onChange={e =>
                    handleSelect(idx, movies.find(m => m.id === Number(e.target.value)))
                  }
                  defaultValue=""
                >
                  <option value="">Pick Movie</option>
                  {movies.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-large" style={{ marginTop: 36, color: "#fff", background: "#3bb43b" }} onClick={handleFinish}>
        Finish & See Result
      </button>
    </div>
  );
}

export default MovieBingo;
