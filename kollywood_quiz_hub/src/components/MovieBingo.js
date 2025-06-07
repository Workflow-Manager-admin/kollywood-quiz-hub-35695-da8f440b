import React, { useState, useEffect } from "react";
import { fetchKollywoodMovies } from "../api/tmdb";
import QuizResult from "./QuizResult";

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

  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then(data => {
        setMovies(data.sort(() => 0.5 - Math.random()).slice(0, 18));
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
