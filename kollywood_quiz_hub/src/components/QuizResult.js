import React from "react";

/**
 * QuizResult
 * Shows user's score, correct answers, and navigation button PUBLIC_INTERFACE
 */
function QuizResult({ score, total, answers, onHome, game }) {
  // Helper: Render movie title and poster if available for richer answers
  function renderMovieAnswer(title, poster, fallback = "—") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {poster ? (
          <img
            src={
              poster.startsWith("http")
                ? poster
                : `https://image.tmdb.org/t/p/w92${poster}`
            }
            alt={title || fallback}
            style={{
              width: 36,
              height: 52,
              objectFit: "cover",
              borderRadius: 4,
              marginRight: 5,
              border: "1.5px solid #b8ede8"
            }}
          />
        ) : null}
        <span>{title || fallback}</span>
      </span>
    );
  }

  // Helper for normalized string or fallback display value
  function safe(val, fallback = "—") {
    return typeof val === "string" && val.trim().length > 0
      ? val
      : fallback;
  }

  return (
    <div className="container" style={{ paddingTop: 100, textAlign: "center" }}>
      <h2 className="title" style={{ color: "#2494a8", fontSize: "2.2rem", marginBottom: 10 }}>
        {game} Results
      </h2>
      <div className="description" style={{ fontSize: "1.25em", margin: "10px auto 24px" }}>
        You scored <b>{score}</b> out of <b>{total}</b>!
      </div>
      <div style={{
        background: "#f6fbfd",
        borderRadius: 11,
        margin: "0 auto 20px",
        padding: 24,
        maxWidth: 430,
        textAlign: "left",
        color: "#003457",
        fontSize: 16
      }}>
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          {answers &&
            answers.map((a, i) => (
              <li key={i} style={{ marginBottom: 12, borderBottom: "1px solid #e3f0fb", paddingBottom: 8 }}>
                {a.character && <span><b>Character:</b> {safe(a.character)}<br /></span>}
                <span>
                  <b>Your Answer:</b>{" "}
                  <span style={{ color: a.wasCorrect ? "#27b14b" : "#b11124" }}>
                    {typeof a.revealed !== "undefined" && a.revealed
                      ? <em>Revealed (no score)</em>
                      : (a.answerTitle
                        ? renderMovieAnswer(a.answerTitle, a.answerPoster)
                        : a.guess || a.guessedMovie || a.title || "—")
                    }
                  </span>
                  <br />
                  <b>Correct:</b>{" "}
                  {a.correctTitle
                    ? renderMovieAnswer(a.correctTitle, a.correctPoster)
                    : (a.correct || a.actualMovie || a.title || "—")}
                  {a.wasCorrect === false && a.answerId && a.correctId && a.answerId !== a.correctId && (
                    <span style={{ color: "#de0249", fontSize: 13, marginLeft: 7 }}>
                      {/* Marker for clarification if IDs mismatched */}
                      [id: {String(a.answerId)} ≠ {String(a.correctId)}]
                    </span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      </div>
      <button className="btn btn-large" style={{ background: "var(--base-light)", color: "#111" }} onClick={onHome}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default QuizResult;
