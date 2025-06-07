import React from "react";

/**
 * QuizResult
 * Shows user's score, correct answers, and navigation button PUBLIC_INTERFACE
 */
function QuizResult({ score, total, answers, onHome, game }) {
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
                {a.character && <span><b>Character:</b> {a.character}<br /></span>}
                <span>
                  <b>Your Answer:</b> <span style={{ color: a.wasCorrect ? "#27b14b" : "#b11124" }}>
                    {a.guess || a.guessedMovie || (a.title || "—")}
                  </span>
                  <br />
                  <b>Correct:</b> {a.correct || a.actualMovie || a.title || "—"}
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
