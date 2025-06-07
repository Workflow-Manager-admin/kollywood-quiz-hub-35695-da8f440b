import React, { useState } from "react";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * PUBLIC_INTERFACE
 * MoviePropsInventory — Kollywood-only, 4-emoji/animated icon clues per movie, no poster or title displayed.
 * 
 * - Only uses a hand-curated set of movies and their emoji clues (strictly Kollywood).
 * - Each clue set uses 4 strong visually distinct emoji props.
 * - Strong font color/font-weight styling for clues and input.
 */
function MoviePropsInventory({ onBackToDashboard }) {
  // Curated Kollywood movies and their prop clues
  // All clues are emojis with description, 4 per movie
  const MOVIE_PROP_CLUES = [
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

  // Shuffle and select QUESTIONS unique rounds
  function pickRounds() {
    let arr = MOVIE_PROP_CLUES.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, QUESTIONS);
  }

  const [quizRounds] = useState(() => pickRounds());
  const [step, setStep] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(null); // {correct, correctTitle}
  const [reveal, setReveal] = useState(false);
  const [quizOver, setQuizOver] = useState(false);

  // PUBLIC_INTERFACE - Submission handler
  function handleSubmit(e) {
    e.preventDefault();
    if (!quizRounds[step] || quizOver) return;
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
    setShowFeedback({ correct: false, correctTitle });
    setUserAnswers(prev => [
      ...prev,
      { guess: "", correct: correctTitle, wasCorrect: false, revealed: true }
    ]);
    setTimeout(() => {
      setShowFeedback(null);
      setUserInput("");
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // Render the prop clue box for 4 strong-styled emoji clues
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
            key={c.emoji + i}
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
            aria-label={"Clue: " + c.label}
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
              {c.emoji}
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

      <h2 className="title" style={{
        fontSize: "1.42rem", marginBottom: 15, color: "#1762b6",
        letterSpacing: ".02em", textShadow: "0 2px 8px #ffd"
      }}>
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
            letterSpacing: ".01em"
          }}
          onClick={handleReveal}
          disabled={reveal || !!showFeedback}
        >
          Reveal Answer
        </button>
      </div>
      {/* Feedback area */}
      {showFeedback && (
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
            : <>✖️ <span style={{ color: "#a43424" }}>Incorrect.</span> {!reveal && <>The answer: <span style={{ color: "#e99113" }}>{showFeedback.correctTitle}</span></>}</>
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
