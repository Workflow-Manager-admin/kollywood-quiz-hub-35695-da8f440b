import React, { useEffect, useState } from 'react';
import './App.css';
import { fetchKollywoodMovies } from './api/tmdb';

function App() {
  // Store movies in state
  const [kollywoodMovies, setKollywoodMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Demo: Fetch Tamil movies when component mounts
  useEffect(() => {
    setLoading(true);
    fetchKollywoodMovies()
      .then(movies => {
        setKollywoodMovies(movies.slice(0, 5)); // Show top 5 for demo
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || 'Error fetching movies');
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> KAVIA AI
            </div>
            <button className="btn">Template Button</button>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <div className="hero">
            <div className="subtitle">AI Workflow Manager Template</div>
            <h1 className="title">kollywood_quiz_hub</h1>
            <div className="description">
              Start building your application.
            </div>
            <button className="btn btn-large">Button</button>

            {/* Demo Block: Kollywood movies fetched from TMDB */}
            <div style={{ marginTop: 40, width: "100%", textAlign: "left" }}>
              <h2 style={{ color: "var(--base-light)" }}>Trending Kollywood (Tamil) Movies <span role="img" aria-label="film">🎬</span></h2>
              {loading && <div>Loading movies...</div>}
              {error && <div style={{ color: 'red' }}>{error}</div>}
              {!loading && !error && kollywoodMovies.length === 0 && (
                <div>No movies found!</div>
              )}
              <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                {kollywoodMovies.map((movie) => (
                  <li key={movie.id} style={{
                    marginBottom: 18,
                    background: 'rgba(0,0,0,0.11)',
                    padding: 12,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {movie.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        style={{ marginRight: 14, borderRadius: 3, width: 52 }}
                      />
                    )}
                    <div>
                      <b>{movie.title}</b><br />
                      <span style={{ fontSize: '0.95em', color: 'var(--text-secondary)' }}>
                        Released: {movie.release_date || 'N/A'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* End demo block */}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;