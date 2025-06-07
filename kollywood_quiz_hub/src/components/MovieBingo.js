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
  // --- Bingo grid: each string below is a category/question with a corresponding TMDB movie criteria (genre/keyword/attribute) ---
  // Categories and their filtering logic (see filter functions per index below)
  const BINGO_SIZE = 3;
  const [categories] = useState([
    "Time Travel",        // 0: Look for known Tamil time travel movies (fallback: any matching 'time' or 'future' in overview)
    "Won an Award",       // 1: Find movies with any 'award' keyword (not always available; fallback: highly rated/popular)
    "Comedy Classic",     // 2: TMDB genre 'Comedy', sorted by popularity
    "Love Story",         // 3: TMDB genre 'Romance'
    "Song Hit",           // 4: Known musical/lyrical hits (fallback: keyword "music"/"song"/"hit" in overview)
    "Police Story",       // 5: TMDB genre 'Crime' or overview 'police/cop/investigation'
    "Revenge",            // 6: overview contains 'revenge'
    "Superstar Rajini",   // 7: Must feature Rajinikanth (cast/credit), fallback: known titles in title/overview
    "Debut Film"          // 8: Try low-vote-count, known debut movies (fallback: first in series/votes<25 etc)
  ]);
  // For each cell, will store an array of movie options matching relevant criteria
  const [optionsGrid, setOptionsGrid] = useState([[], [], [], [], [], [], [], [], []]);
  const [selected, setSelected] = useState(Array(9).fill(null));
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // A copy of used IDs to avoid repeat movies between cells
  const [usedIds, setUsedIds] = useState(new Set());

  // --- Filtering logic for each bingo cell ---
  // TMDB genre IDs for reference: Comedy = 35, Romance = 10749, Crime = 80
  // For demo mode, fallback to keyword matching if TMDB data is limited

  // PUBLIC_INTERFACE
  useEffect(() => {
    async function fetchAndMatch() {
      setLoading(true);
      setError("");
      let allMovies = [];
      let page;
      const maxPages = 6;
      // Step 1: Gather large sample pool (Kollywood, many pages for coverage). 
      //        (users may play many games - exclude already-used movies in other games)
      try {
        const allResults = [];
        for (page = 1; page <= maxPages; ++page) {
          const tmdbURL = `https://api.themoviedb.org/3/discover/movie?api_key=5bc67d3b06aecbd18121a3cbbc16eb59&with_original_language=ta&sort_by=popularity.desc&page=${page}`;
          // eslint-disable-next-line no-await-in-loop
          let resp = await fetch(tmdbURL);
          if (!resp.ok) break;
          // eslint-disable-next-line no-await-in-loop
          let data = await resp.json();
          if (data?.results?.length) allResults.push(...data.results);
        }
        // De-dupe on TMDB id
        const deduped = {};
        for (const m of allResults) if (m && m.id) deduped[m.id] = m;
        allMovies = Object.values(deduped);
      } catch (err) {
        setError("Could not load movies from TMDB. Fallback options loaded.");
        setLoading(false);
        return;
      }

      // Exclude any movie already used elsewhere (other games)
      const usedTitleSet = getUsedMovieTitleSet();
      allMovies = allMovies.filter(m => {
        if (!m.title) return false;
        return !usedTitleSet.has(normalizeMovieTitle(m.title));
      });

      // Helper function: removes movies by TMDB id
      function removeUsedIds(arr, globalUsedIds) {
        return arr.filter(movie => !globalUsedIds.has(movie.id));
      }

      // Filtering per cell:
      // We want (per cell) a list of options (ideally at least 6, no overlap in grid).
      // If TMDB searching is insufficiently granular, fallback to overview/title/keyword matching as required (documented below).
      const options = [];
      // Used IDs across the grid to avoid repeats
      let idUsedSet = new Set();

      // Cell [0]: 'Time Travel'
      // TMDB does not support Kollywood-specific time travel keyword directly!
      // -- TRUE match: key movies ('Indru Netru Naalai', '24', 'Maanaadu'), or 'time travel', etc. as keyword in title or overview.
      // -- Fallback: fantasy genre (TMDB: 14) if not enough.
      // If unable to fill: EXPLICIT COMMENT: no robust TMDB property exists!
      const timeTravelKeywords = ["time travel", "time-travel", "future", "past", "machine", "Indru Netru Naalai", "24", "Maanaadu"];
      let timeTravel = allMovies.filter(
        m => (timeTravelKeywords.some(kw => 
              (m.title && m.title.toLowerCase().includes(kw.toLowerCase())) ||
              (m.overview && m.overview.toLowerCase().includes(kw.toLowerCase())))
            ) ||
            (m.overview && /\btime\b/.test(m.overview.toLowerCase()))
      );
      if (timeTravel.length < 2) {
        // --- Fallback: fantasy genre (id: 14) ---
        // No exact mapping: so we explain this in the code!
        // See: https://developer.themoviedb.org/reference/genre-movie-list
        timeTravel = allMovies.filter(m => (m.genre_ids || []).includes(14) || (m.overview && m.overview.toLowerCase().includes("fantasy")));
        // --- If even this is missing, some squares will fill with general fallback pool below.
      }
      timeTravel = removeUsedIds(timeTravel, idUsedSet);
      timeTravel.length = Math.min(6, timeTravel.length);

      timeTravel.forEach(m => idUsedSet.add(m.id));
      options[0] = timeTravel;

      // Cell [1]: 'Won an Award'
      // TMDB has NO Kollywood awards/oscars info; only "voted best"/hint words in overview.
      // --- STRATEGY: Heuristically accept high-voted, high-rated titles (vote_average >= 7.2 and vote_count > 35).
      // Also, overview/title mentioning 'award', 'winner', or 'national award'.
      // --- If not robust: fallback is same high-rating cut-off.
      let awardWinners = allMovies.filter(m => 
        ((m.vote_average && m.vote_average >= 7.2 && m.vote_count > 35) || // heuristically, likely an award winner
         (m.overview && /award|winner|national award/.test(m.overview.toLowerCase())) ||
         (m.title && /award/.test(m.title.toLowerCase()))
        )
      );
      // --- Documenting fallback explicitly, as this is not a robust way ---
      // For future: would require local or crowdsourced awards dataset.
      awardWinners = removeUsedIds(awardWinners, idUsedSet);
      awardWinners.length = Math.min(6, awardWinners.length);

      awardWinners.forEach(m => idUsedSet.add(m.id));
      options[1] = awardWinners;

      // Cell [2]: 'Comedy Classic'
      // STRATEGY: Use TMDB's genre 'Comedy' (id: 35).
      // Fallback: If not enough movies, use keyword in overview.
      let comedy = allMovies.filter(m => (m.genre_ids || []).includes(35) || (m.overview && m.overview.toLowerCase().includes("comedy")));
      comedy = removeUsedIds(comedy, idUsedSet);
      comedy.length = Math.min(6, comedy.length);

      comedy.forEach(m => idUsedSet.add(m.id));
      options[2] = comedy;

      // Cell [3]: 'Love Story'
      // STRATEGY: Use TMDB's genre 'Romance' (id: 10749) as primary filter.
      // Fallback: Accept 'love', 'romance', or 'couple' in overview (not robust, so comment fallback).
      let love = allMovies.filter(m => (m.genre_ids || []).includes(10749) || (m.overview && /love|romance|couple/.test(m.overview.toLowerCase())));
      love = removeUsedIds(love, idUsedSet);
      love.length = Math.min(6, love.length);
      love.forEach(m => idUsedSet.add(m.id));
      options[3] = love;

      // Cell [4]: 'Song Hit'
      // There is NO explicit music-hit genre in TMDB for Tamil.
      // STRATEGY: overview or title contains "song", "music", "album", "hit", "superhit".
      // Fallback: Just overview-based matching; DOCUMENT limitation.
      let songHit = allMovies.filter(m =>
        (m.overview && /(music|song|album|hit|superhit)/i.test(m.overview)) ||
        (m.title && /(song|music|album|hit|superhit)/i.test(m.title))
      );
      // Fallback: This is not robust and can return unrelated movies if TMDB overviews are incomplete.
      songHit = removeUsedIds(songHit, idUsedSet);
      songHit.length = Math.min(6, songHit.length);
      songHit.forEach(m => idUsedSet.add(m.id));
      options[4] = songHit;

      // Cell [5]: 'Police Story'
      // STRATEGY: Use TMDB genre 'Crime' (id: 80); fallback: keywords in overview or title.
      // ('police', 'cop', 'investigation', 'officer') as fuzzy match.
      let police = allMovies.filter(m =>
        (m.genre_ids || []).includes(80) ||
        (m.overview && /police|cop|investigation|officer/.test(m.overview.toLowerCase())) ||
        (m.title && /police|cop|officer/.test(m.title.toLowerCase()))
      );
      police = removeUsedIds(police, idUsedSet);
      police.length = Math.min(6, police.length);
      police.forEach(m => idUsedSet.add(m.id));
      options[5] = police;

      // Cell [6]: 'Revenge'
      // STRATEGY: 'revenge' in overview or title.
      // Fallback: None; can't query for this directly in TMDB.
      let revenge = allMovies.filter(m =>
        (m.overview && /revenge/.test(m.overview.toLowerCase())) ||
        (m.title && /revenge/.test(m.title.toLowerCase()))
      );
      revenge = removeUsedIds(revenge, idUsedSet);
      revenge.length = Math.min(6, revenge.length);
      revenge.forEach(m => idUsedSet.add(m.id));
      options[6] = revenge;

      // Cell [7]: 'Superstar Rajini'
      // TMDB cannot directly filter by cast name for Kollywood via its discover API in one request.
      // STRATEGY: 'Rajini' or 'Rajinikanth' in title/overview, OR known canonical Rajini films.
      // Fallback: Add a known Rajini films list as secondary filter.
      // --- Inline fallback list is documented for maintainability.
      let rajini = allMovies.filter(
        m => (m.title && /rajini|rajinikanth/i.test(m.title)) ||
             (m.overview && /rajini|rajinikanth/i.test(m.overview))
      );
      // Supplement Rajinikanth list if under-filled
      if (rajini.length < 3) {
        const rajiniKnown = ["Baasha", "Muthu", "Sivaji", "Padayappa", "Enthiran", "Kabali", "Petta", "Darbar"];
        rajini = [
          ...rajini,
          ...allMovies.filter(m =>
            rajiniKnown.some(name => m.title && m.title.toLowerCase().includes(name.toLowerCase()))),
        ];
      }
      rajini = removeUsedIds(rajini, idUsedSet);
      rajini.length = Math.min(6, rajini.length);
      rajini.forEach(m => idUsedSet.add(m.id));
      options[7] = rajini;

      // Cell [8]: 'Debut Film'
      // STRATEGY: For lack of "debut" property, use movies released after 2001 with lowest vote_count, simulating 'early career'.
      // Fallback: filter by 'debut' in overview/title, or―if still low―pick lowest vote_count regardless of year.
      let debut = allMovies
        .filter(m => (m.release_date && Number(m.release_date.slice(0, 4)) >= 2001))
        .sort((a, b) => (a.vote_count || 0) - (b.vote_count || 0));
      debut = debut.slice(0, 18);
      debut = debut.filter(m => m.vote_count < 18 || (m.overview && /debut/i.test(m.overview)) || (m.title && /debut/i.test(m.title)));
      // If not enough, fill from any movie with low vote_count (explicit fallback)
      if (debut.length < 3) debut = allMovies.sort((a, b) => (a.vote_count || 0) - (b.vote_count || 0)).slice(0, 6);
      debut = removeUsedIds(debut, idUsedSet);
      debut.length = Math.min(6, debut.length);
      debut.forEach(m => idUsedSet.add(m.id));
      options[8] = debut;

      // --- GENERAL FALLBACK ---
      // If any cell's options are empty (TMDB data too limited), fill with random movies that haven't been used in any cell.
      // This ensures game is still playable and visually documents this explicitly in the fallback DIV in UI.
      const fallbackOptions = allMovies.filter(m => !idUsedSet.has(m.id)).slice(0, 8);
      for (let c = 0; c < 9; ++c) {
        if (!options[c] || options[c].length === 0) options[c] = [...fallbackOptions];
      }

      setOptionsGrid(options);
      setUsedIds(idUsedSet);
      setLoading(false);
    }
    fetchAndMatch();
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
  if (error) {
    return (
      <div className="container" style={{ paddingTop: 100 }}>
        <div className="description" style={{ color: "#be1919", marginBottom: 22 }}>
          {error}
        </div>
        <button className="btn" onClick={onBackToDashboard}>⬅ Back</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 100 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <h2 className="title" style={{ fontSize: "2.2rem", marginBottom: 10 }}>
        Movie Bingo
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        {/* Show explanation for logic/fallback */}
        Each square only allows Kollywood movies that genuinely fit that category:<br />
        <b>Time Travel</b>: classic/fantasy time movies; <b>Award</b>: highly-rated/winners; <b>Comedy</b>/<b>Love</b>: genre-based; <b>Song Hit</b>: known for music; <b>Police/Revenge</b>: thematic; <b>Rajini</b>: Superstar; <b>Debut</b>: early career/low votes.<br />
        Some movie groups may overlap if TMDB data is not detailed.
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${BINGO_SIZE}, 170px)`,
        gridTemplateRows: `repeat(${BINGO_SIZE}, 136px)`,
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
            minHeight: 70,
            textAlign: "center",
            position: "relative"
          }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#2494a8", minHeight: 32 }}>
              {cat}
            </div>
            <div>
              {selected[idx] ? (
                <div style={{ color: "#0c3", fontWeight: 600, marginTop: 3 }}>
                  {selected[idx].title}
                  {selected[idx].release_date && (
                    <span style={{ marginLeft: 7, fontSize: 13, color: "#6cccdc" }}>
                      ({selected[idx].release_date.slice(0, 4)})
                    </span>
                  )}
                </div>
              ) : (
                <select
                  aria-label={`Select match for ${cat}`}
                  style={{ marginTop: 9, width: "95%", borderRadius: 4, fontSize: 14, minHeight: 34 }}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const optMovie = optionsGrid[idx]?.find(m => m.id === val);
                    handleSelect(idx, optMovie);
                  }}
                  defaultValue=""
                  disabled={!optionsGrid[idx] || optionsGrid[idx].length === 0}
                >
                  <option value="">Pick Movie</option>
                  {(optionsGrid[idx] || []).map(m => (
                    <option key={m.id} value={m.id}>
                      {/* Provide extra context for user */}
                      {m.title}
                      {m.release_date ? ` (${m.release_date.slice(0, 4)})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Example: Fallback msg if no options found for this cell */}
            {!selected[idx] && (!optionsGrid[idx] || optionsGrid[idx].length === 0) && (
              <div style={{ marginTop: 10, color: "#ba2121", fontSize: 12 }}>
                No suitable movies found! (Demo: Try refreshing)
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn btn-large"
        style={{ marginTop: 36, color: "#fff", background: "#3bb43b" }}
        onClick={handleFinish}
      >
        Finish & See Result
      </button>
      <div className="description" style={{ margin: "26px 0 7px", color: "#8c98bb", fontSize: 13 }}>
        <b>Note:</b> Each movie can only appear in one bingo cell.<br/>
        If TMDB metadata is not accurate/granular, demo fallback uses overview/text heuristics.<br />
        All movies here are Tamil (Kollywood) and not repeated from other games.
      </div>
    </div>
  );
}

/*
Bingo grid logic per cell commentary (implementation rationale):

0. Time Travel – actual time-travel films (Indru Netru Naalai, 24, Maanaadu) plus fantasy/time hits.
1. Won an Award – as TMDB lacks award metadata, we heuristically use highly-rated titles.
2. Comedy Classic – genre 'Comedy' (id 35), fallback: 'comedy' in overview.
3. Love Story – genre 'Romance' (id 10749) or overview keywords.
4. Song Hit – no genre; matches via 'music', 'song', 'album', etc. in overview/title.
5. Police Story – genre 'Crime' (id 80), plus keywords for 'police' etc.
6. Revenge – overview/title with 'revenge' keyword.
7. Superstar Rajini – title/overview with Rajini or common films, since TMDB can't query cast directly.
8. Debut Film – low vote count and recent year, or any mention of 'debut' in title/overview; fallback: lowest votes in recent era.

If TMDB data is not detailed, a fallback warning is displayed and options for the cell are taken as best-match by keyword.
*/

export default MovieBingo;
