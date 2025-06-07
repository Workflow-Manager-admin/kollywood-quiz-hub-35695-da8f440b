import React from "react";

/**
 * QuizProgress component
 * Shows progress bar and current question out of total.
 * PUBLIC_INTERFACE
 */
function QuizProgress({ current, total }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div
      style={{
        margin: "12px 0 26px 0",
        display: "flex",
        alignItems: "center",
        gap: 14
      }}
    >
      <div style={{
        minWidth: 120,
        maxWidth: 160,
        height: 12,
        background: "#e2e9f0",
        borderRadius: 12,
        overflow: "hidden",
        flex: "1 1 100px"
      }}>
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "var(--base-light)",
            borderRadius: 12,
            transition: "width .25s"
          }}
        />
      </div>
      <span style={{ color: "#101457", fontWeight: 600, fontSize: 14 }}>
        {current} / {total}
      </span>
    </div>
  );
}

export default QuizProgress;
