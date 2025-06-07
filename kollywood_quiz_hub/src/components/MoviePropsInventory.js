import React, { useState } from "react";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * PUBLIC_INTERFACE
 * MoviePropsInventory — Kollywood-only, 4-emoji/animated icon clues per movie, no poster or title displayed.
 */
function MoviePropsInventory({ onBackToDashboard }) {
  // All movies and clues must be Kollywood (Tamil) only. Each object has 4 clues and a single answer.
  // Example clue set: cycle emoji, Indian cobra emoji, pot emoji, potato emoji for answer 'Meiyazhagan'

  // Source: Hardcoded Kollywood clue sets (all clues are string emojis/descriptive icon as required)
  const FOUR_PROP_CLUES = [
    {
      answer: "Meiyazhagan",
      clues: [
        { emoji: "🚲", label: "Cycle" },
        { emoji: "🐍", label: "Indian Cobra" },
        { emoji: "🪣", label: "Pot" },
        { emoji: "🥔", label: "Potato" }
      ]
    },
    {
      answer: "Baasha",
      clues: [
        { emoji: "🕶️", label: "Sunglasses" },
        { emoji: "🛺", label: "Auto Rickshaw" },
        { emoji: "🚬", label: "Cigar" },
        { emoji: "💪", label: "Power" }
      ]
    },
    {
      answer: "Anbe Sivam",
      clues: [
        { emoji: "☂️", label: "Red Umbrella" },
        { emoji: "🧔‍♂️", label: "Beard" },
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
        { emoji: "👮‍♂️", label: "Police" },
        { emoji: "🔫", label: "Gun" },
        { emoji: "🏡", label: "House" },
        { emoji: "🎸", label: "Guitar" }
      ]
    },
    {
      answer: "Super Deluxe",
      clues: [
        { emoji: "🏳️‍⚧️", label: "Transgender" },
        { emoji: "💔", label: "Broken Heart" },
        { emoji: "🔫", label: "Gun" },
        { emoji: "📺", label: "TV" }
      ]
    },
    {
      answer: "Cuckoo",
      clues: [
        { emoji: "🎻", label: "Violin" },
        { emoji: "🕶️", label: "Shades" },
        { emoji: "🌅", label: "Morning" },
        { emoji: "🦯", label: "Blind Cane" }
      ]
    },
    {
      answer: "Mouna Ragam",
      clues: [
        { emoji: "💍", label: "Ring" },
        { emoji: "👰‍♀️", label: "Bride" },
        { emoji: "💔", label: "Heartbreak" },
        { emoji: "🏠", label: "Home" }
      ]
    }
  ];

  const QUESTIONS = 8; // Show 8 questions per session

  // Shuffle and pick unique rounds for every session
  function pickRandomRounds() {
    let arr = FOUR_PROP_CLUES.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, QUESTIONS);
  }

  const [quizRounds] = useState(() => pickRandomRounds());
  const [step, setStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(null); // {correct, correctTitle}
  const [reveal, setReveal] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  // PUBLIC_INTERFACE - Submission
  function handleSubmit(e) {
    e.preventDefault();
    if (!quizRounds[step] || quizOver) return;
    const guess = (userAnswer || "").trim().toLowerCase();
    const correctTitle = quizRounds[step].answer;
    const wasCorrect = guess === correctTitle.trim().toLowerCase();
    setShowAnswerFeedback({ correct: wasCorrect, correctTitle });
    setUserAnswers((prev) => [
      ...prev,
      {
        guess,
        correct: correctTitle,
        wasCorrect
      }
    ]);
    setReveal(false);
    setTimeout(() => {
      setShowAnswerFeedback(null);
      setUserAnswer("");
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1400);
  }

  // PUBLIC_INTERFACE - Reveal/giveup
  function handleReveal() {
    setReveal(true);
    const correctTitle = quizRounds[step].answer;
    setShowAnswerFeedback({ correct: false, correctTitle });
    setUserAnswers((prev) => [
      ...prev,
      { guess: "", correct: correctTitle, wasCorrect: false, revealed: true }
    ]);
    setTimeout(() => {
      setShowAnswerFeedback(null);
      setUserAnswer("");
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // VISUAL: Four large clue icons per movie, no titles/posters/hints
  function renderPropClueBox(clues) {
    if (!clues || clues.length < 1) return null;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
          marginTop: 14,
          marginBottom: 20
        }}
        aria-label="Movie prop clues"
      >
        {clues.map((c, i) => (
          <div
            key={c.emoji + "-" + i}
            style={{
              background: "linear-gradient(135deg, #ffe54c 70%, #25b6e6 125%)",
              border: "3.2px solid #0ad09c",
              borderRadius: 16,
              minWidth: 84,
              minHeight: 84,
              fontSize: 44,
              color: "#1f1f1f",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              boxShadow: "0 3px 16px #bafff4, 0 7px 40px #ffe44e55",
              padding: "10px 12px 3px 12px",
              position: "relative",
              transition: "transform .14s",
              outline: "none"
            }}
            aria-label={"Clue: " + c.label}
            tabIndex={0}
          >
            <span
              style={{
                fontSize: 50,
                lineHeight: 1.03,
                marginBottom: 2,
                textShadow: "0 2px 12px #fff9b5, 0 4px 32px #1b5c4e33,0 1.9px 7px #fee"
              }}
              aria-label={c.label}
              role="img"
            >
              {c.emoji}
            </span>
            <span
              style={{
                fontSize: 19,
                color: "#074c52",
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
  if (!quizRounds[step]) return null;

  return (
    <div className="container" style={{ paddingTop: 95, maxWidth: 510, marginBottom: 30 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      <QuizProgress current={step + 1} total={QUESTIONS} />

      <h2 className="title" style={{
        fontSize: "1.45rem", marginBottom: 16, color: "#04608c", textShadow: "0 2px 8px #fff"
      }}>
        Movie Props Inventory
      </h2>
      <div
        className="description"
        style={{
          marginBottom: 15,
          color: "#f9f503",
          fontWeight: 600,
          fontSize: 17,
          textShadow: "0 1.7px 8px #336"
        }}
      >
        Guess the Kollywood movie using these <span style={{ color: "#1e7ac7" }}>4 prop clues</span>. All clues are emoji props/icons!
      </div>
      {renderPropClueBox(quizRounds[step].clues)}
      <form
        onSubmit={handleSubmit}
        style={{ marginBottom: 14, textAlign: "center" }}
        autoComplete="off"
        aria-label="Guess movie by prop clues"
      >
        <input
          type="text"
          placeholder="Your Guess (movie title)"
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          autoFocus
          disabled={reveal || !!showAnswerFeedback}
          style={{
            padding: "14px",
            width: 220,
            borderRadius: 7,
            border: "2px solid #0ad09c",
            fontSize: "1.09rem",
            marginRight: 10,
            marginBottom: 4,
            boxShadow: "0 1px 9px #ffe46425",
            background: reveal ? "#eee" : "#fff",
            color: "#154265",
            fontWeight: 700
          }}
          aria-label="Enter movie answer"
        />
        {!reveal && !showAnswerFeedback && (
          <button
            className="btn btn-large"
            type="submit"
            style={{
              background: "#ffe14d",
              color: "#232",
              fontWeight: 900,
              fontSize: 16,
              boxShadow: "0 1px 11px #ffe44e33"
            }}
          >
            Submit
          </button>
        )}
      </form>
      <div style={{ marginBottom: 11 }}>
        <button
          type="button"
          className="btn"
          style={{
            background: "#25b6e6",
            color: "#ffe44b",
            marginLeft: 3,
            fontWeight: 700,
            fontSize: 15
          }}
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
            marginTop: 20,
            marginBottom: 9,
            fontWeight: 900,
            fontSize: 19,
            color: showAnswerFeedback.correct ? "#15be3c" : "#da4f35",
            letterSpacing: ".01em",
            textShadow: showAnswerFeedback.correct
              ? "0 1px 8px #35fa98,0 3px 19px #33ffaa44"
              : "0 1px 8px #ee9a94,0 1.5px 12px #fde1e1",
            background: showAnswerFeedback.correct ? "#fffdd8" : "#fff1ee",
            borderRadius: 9,
            padding: "10px 14px 5px 14px",
            display: "inline-block"
          }}
          aria-live="assertive"
        >
          {showAnswerFeedback.correct
            ? <>✔️ <span style={{ color: "#04608c" }}>Correct!</span> The movie was: <span style={{ color: "#e3a813" }}>{showAnswerFeedback.correctTitle}</span></>
            : <>✖️ <span style={{ color: "#ae2b0b" }}>Incorrect.</span> {reveal ? "" : <>The answer: <span style={{ color: "#e3a813" }}>{showAnswerFeedback.correctTitle}</span></>}</>
          }
        </div>
      )}

      <div style={{ color: "#789", fontSize: 13, marginTop: 16 }}>
        All clues and answers are Kollywood movies only. Props shown as emoji/icons for maximum visibility.
      </div>
    </div>
  );
}

export default MoviePropsInventory;
