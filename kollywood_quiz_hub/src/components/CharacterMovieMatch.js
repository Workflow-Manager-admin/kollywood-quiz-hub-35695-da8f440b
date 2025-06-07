import React, { useState, useEffect } from "react";
import QuizProgress from "./QuizProgress";
import QuizResult from "./QuizResult";

/**
 * Character-Movie Match: Drag Kollywood character clue onto correct movie poster (with distractors), 10 quiz rounds.
 * PUBLIC_INTERFACE
 */
function CharacterMovieMatch({ onBackToDashboard }) {
  // Constants for rounds and options per question
  const QUESTIONS = 10;
  const CHOICES_PER_QUESTION = 4;

  // Fallback/demo questions for demo and offline
  // Thillana Mohanambal references have been removed.
  // Poster overrides for VIP, Gentleman, and Muthu are strictly enforced with correct TMDB Kollywood poster paths.
  // Confirm all movie objects for these three have correct poster_path and TMDB IDs.
  const FALLBACK_QUESTIONS = [
    {
      clue: "mukundh varadharajan",
      correctMovie: "Amaran",
      correctMovieObj: {
        title: "Amaran",
        poster_path: "/A4pZ0b8UoLxa6pnx6tEN84ImU8e.jpg",
        id: "fallback1"
      },
      choices: [
        {
          title: "Amaran",
          poster_path: "/A4pZ0b8UoLxa6pnx6tEN84ImU8e.jpg",
          id: "fallback1"
        },
        {
          title: "Mouna Ragam",
          poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
          id: "fallback2"
        },
        {
          title: "Enthiran",
          poster_path: "/cZy1FIKwpsbRdd3RMa9FaXGFDeA.jpg",
          id: "fallback3"
        },
        {
          // Correct Gentleman TMDB Kollywood poster, correct ID
          title: "Gentleman",
          poster_path: "/6DTUYTzszbmWzxubUANWkPWWB6E.jpg",
          id: 97596
        }
      ]
    },
    {
      clue: "Muthu",
      correctMovie: "Muthu",
      correctMovieObj: {
        title: "Muthu",
        poster_path: "/w1JkfQDANBvXOFW9vDOM1pk2rt9.jpg", // ID 109007
        id: 109007
      },
      choices: [
        {
          title: "Muthu",
          poster_path: "/w1JkfQDANBvXOFW9vDOM1pk2rt9.jpg",
          id: 109007
        },
        {
          title: "VIP",
          poster_path: "/gQjF5E3w05QGeeQjRgdvnNZNTKk.jpg",
          id: 278788
        },
        {
          title: "Anbe Sivam",
          poster_path: "/6vAo-VP5NdVs4KJIp4jOSAmhpX6.jpg",
          id: "fallback5"
        },
        {
          title: "Sivaji",
          poster_path: "/5Lwc5yRvCNr4ieVsgGAaHo9dZYk.jpg",
          id: "fallback6"
        }
      ]
    },
    {
      clue: "Dhanush",
      correctMovie: "VIP",
      correctMovieObj: {
        title: "VIP",
        poster_path: "/gQjF5E3w05QGeeQjRgdvnNZNTKk.jpg", // ID 278788
        id: 278788
      },
      choices: [
        {
          title: "VIP",
          poster_path: "/gQjF5E3w05QGeeQjRgdvnNZNTKk.jpg",
          id: 278788
        },
        {
          title: "Gentleman",
          poster_path: "/6DTUYTzszbmWzxubUANWkPWWB6E.jpg",
          id: 97596
        },
        {
          title: "Maari",
          poster_path: "/lfZ9vQqOecL50DJBSNivoobHxPP.jpg",
          id: "fallback8"
        },
        {
          title: "Mouna Ragam",
          poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg",
          id: "fallback2"
        }
      ]
    }
    // You can add additional static fallback questions here,
    // but do NOT reference Thillana Mohanambal or use non-Kollywood posters for these titles.
  ];

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

  // Hardcoded API setup for TMDB direct queries (overrides env var)
  const TMDB_API_KEY = "5bc67d3b06aecbd18121a3cbbc16eb59";
  const TMDB_BASE_URL = "https://api.themoviedb.org/3";

  // Small fetch utility for search
  async function fetchTMDBMovieByTitle(title) {
    // PUBLIC_INTERFACE
    // Try to fetch the *best match* movie by title (Tamil language)
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=ta`;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      // Try "original_language" == "ta" first; else fallback to first result
      const tamil = (data.results || []).find(
        m => m && m.original_language === "ta"
      );
      return tamil || (data.results && data.results[0]) || null;
    } catch (e) {
      return null;
    }
  }

  // List of pairs for quiz rounds
  const CHARACTER_MOVIE_PAIRS = [
    { character: "Chitti", movie: "Enthiran" },
    { character: "Anbuchelvan IPS", movie: "Kaakha Kaakha" },
    { character: "Velu Naicker", movie: "Nayakan" },
    { character: "Gentleman", movie: "Gentleman" }, // Ensured correct poster/ID
    { character: "Muthu", movie: "Muthu" },
    { character: "Maari", movie: "Maari" },
    { character: "Subramani", movie: "Mouna Ragam" },
    { character: "Dhanush", movie: "VIP" },
    { character: "Nallasivam", movie: "Anbe Sivam" },
    { character: "Rangasamy", movie: "Sivaji" }
  ];

  // State
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [draggedClue, setDraggedClue] = useState(null);
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizOver, setQuizOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  // Optionally cache poster lookups
  const [posterCache, setPosterCache] = useState({});

  // Helper: get movie poster_path (from cache or fetch)
  async function getPosterForTitle(title) {
    if (posterCache[title]) return posterCache[title];
    const movie = await fetchTMDBMovieByTitle(title);
    if (movie && movie.poster_path) {
      setPosterCache(pc => ({ ...pc, [title]: movie.poster_path }));
      return movie.poster_path;
    } else {
      setPosterCache(pc => ({ ...pc, [title]: null }));
      return null;
    }
  }

  // Helper: get n random distractors except excluding given
  async function getDistractorPosters(correctTitle, n) {
    const discoverUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=ta&sort_by=popularity.desc`;
    try {
      const resp = await fetch(discoverUrl);
      if (!resp.ok) return [];
      const data = await resp.json();
      const options = (data.results || []).filter(d =>
        d.title && d.title !== correctTitle && d.poster_path
      );
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return options.slice(0, n);
    } catch (e) {
      return [];
    }
  }

  // --- Poster overrides for VIP, Gentleman, and Muthu (force correct Kollywood poster path and TMDB ID) ---
  // These are strictly enforced overrides to always use the authentic TMDB Kollywood posters, never a remake or non-Kollywood version.
  // VIP (Velaiilla Pattadhari, 2014) - ID: 278788
  const VIP_OVERRIDE = {
    title: "VIP",
    id: 278788,
    poster_path: "/gQjF5E3w05QGeeQjRgdvnNZNTKk.jpg", // TMDB Kollywood official
    original_language: "ta",
  };
  // Gentleman (1993) - ID: 97596
  const GENTLEMAN_OVERRIDE = {
    title: "Gentleman",
    id: 97596,
    poster_path: "/6DTUYTzszbmWzxubUANWkPWWB6E.jpg", // TMDB Kollywood official
    original_language: "ta",
  };
  // Muthu (Rajinikanth, 1995) - ID: 109007
  const MUTHU_OVERRIDE = {
    title: "Muthu",
    id: 109007,
    poster_path: "/w1JkfQDANBvXOFW9vDOM1pk2rt9.jpg", // TMDB Kollywood official
    original_language: "ta",
  };

  // Helper: get movie object with poster_path override for specific movies (using correct TMDB ID/poster)
  function getMovieOverrideObj(title) {
    if (title === "VIP") return { ...VIP_OVERRIDE };
    if (title === "Gentleman") return { ...GENTLEMAN_OVERRIDE };
    if (title === "Muthu") return { ...MUTHU_OVERRIDE };
    return null;
  }

  // MAIN QUIZ ROUND BUILDER
  useEffect(() => {
    let cancelled = false;

    async function prepareRounds() {
      setLoading(true);
      const rounds = [];
      for (let idx = 0; idx < CHARACTER_MOVIE_PAIRS.length; ++idx) {
        const pair = CHARACTER_MOVIE_PAIRS[idx];
        let correctMovieObj = getMovieOverrideObj(pair.movie);
        if (!correctMovieObj) {
          correctMovieObj = await fetchTMDBMovieByTitle(pair.movie);
        }
        // Enforce overrides for VIP, Gentleman, Muthu: always use correct TMDB data
        if (pair.movie === "VIP") {
          correctMovieObj = { ...VIP_OVERRIDE };
        }
        if (pair.movie === "Gentleman") {
          correctMovieObj = { ...GENTLEMAN_OVERRIDE };
        }
        if (pair.movie === "Muthu") {
          correctMovieObj = { ...MUTHU_OVERRIDE };
        }
        let correctPoster = correctMovieObj && correctMovieObj.poster_path;
        let distractorsArr = await getDistractorPosters(
          pair.movie,
          CHOICES_PER_QUESTION - 1
        );
        // Ensure we never include VIP, Gentleman, or Muthu as a distractor (avoid poster collision)
        distractorsArr = distractorsArr.filter(
          d => (
            d.title &&
            !["VIP", "Gentleman", "Muthu"].includes(d.title) &&
            d.poster_path
          )
        );
        // Fill up distractors if not enough with other movies
        while (distractorsArr.length < CHOICES_PER_QUESTION - 1) {
          // Add a visually safe generic Tamil movie poster as decoy
          distractorsArr.push({
            title: `Decoy ${distractorsArr.length + 1}`,
            id: `decoy-${idx}-${distractorsArr.length + 1}`,
            poster_path: "/zI6FqDTKj7fj3FVQHfQj5CqiAUi.jpg", // Mouna Ragam as generic decoy
          });
        }
        // For options, correct (with forced override if necessary) + filtered distractors
        const choicesArr = [
          {
            ...correctMovieObj,
            title: correctMovieObj.title || pair.movie,
            poster_path: correctMovieObj.poster_path || null,
            id: typeof correctMovieObj.id !== "undefined" ? correctMovieObj.id : `tmdb-missing-${idx}`,
          },
          ...distractorsArr.slice(0, CHOICES_PER_QUESTION - 1),
        ].sort(() => 0.5 - Math.random());

        // If any options are missing poster (or round is broken), fallback
        const fallbackNeeded =
          !correctPoster ||
          choicesArr.length < CHOICES_PER_QUESTION ||
          choicesArr.some(c => !c.poster_path);

        if (fallbackNeeded) {
          // Only fallback if not VIP/Gentleman/Muthu round, as those will always have posters above
          if (
            !["VIP", "Gentleman", "Muthu"].includes(pair.movie)
          ) {
            setQuestions(FALLBACK_QUESTIONS);
            setUsingFallback(true);
            setLoading(false);
            return;
          }
          // For VIP, Gentleman, Muthu: never fallback, always use enforced override above (guaranteed poster)
        }
        rounds.push({
          clue: pair.character,
          correctMovie: pair.movie,
          correctMovieObj: correctMovieObj,
          choices: choicesArr
        });
      }
      if (rounds.length < 1 || rounds[0]?.choices?.length < 1) {
        setQuestions(FALLBACK_QUESTIONS);
        setUsingFallback(true);
        setLoading(false);
        return;
      }
      const selectedRounds = rounds.slice(0, QUESTIONS);
      if (!cancelled) {
        setQuestions(selectedRounds);
        setUsingFallback(false);
        setLoading(false);
      }
    }
    prepareRounds();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, []);

  // Drag and Drop Handlers
  function handleDragStart() {
    setDraggedClue(questions[step]);
    setDragActive(true);
  }

  function handleDragEnd() {
    setDraggedClue(null);
    setDragActive(false);
  }

  function allowDrop(event) {
    event.preventDefault();
    setDragActive(true);
  }

  function leaveDrop(event) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDropOnPoster(movieObj, idx, event) {
    event.preventDefault();
    if (answeredIdx !== null) return;
    setAnsweredIdx(idx);
    setTimeout(() => recordAnswer(movieObj), 350);
  }

  // PUBLIC_INTERFACE
  /**
   * Records the user's answer with strict type and value checks on IDs, fallback to normalized title.
   * All result comparison done strictly.
   */
  function recordAnswer(selectedMovieObj) {
    const correctChoice =
      questions[step].choices.find(
        c =>
          (c.id && c.id === (questions[step].correctMovieObj && questions[step].correctMovieObj.id)) ||
          (c.title &&
            questions[step].correctMovieObj &&
            c.title.toLowerCase() === questions[step].correctMovieObj.title.toLowerCase())
      ) ||
      questions[step].correctMovieObj ||
      questions[step].choices.find(c => c.title === questions[step].correctMovie) ||
      null;

    let isCorrect = false;
    let idCompare = false;
    let titleCompare = false;

    if (
      selectedMovieObj &&
      correctChoice &&
      typeof selectedMovieObj.id !== "undefined" &&
      typeof correctChoice.id !== "undefined" &&
      selectedMovieObj.id !== null &&
      correctChoice.id !== null
    ) {
      // Compare types and values as strings
      idCompare = String(selectedMovieObj.id) === String(correctChoice.id);
      isCorrect = idCompare;
    }
    if (!isCorrect && selectedMovieObj && correctChoice) {
      if (
        typeof selectedMovieObj.title === "string" &&
        typeof correctChoice.title === "string"
      ) {
        const normAnswer = selectedMovieObj.title.toLowerCase().trim();
        const normCorrect = correctChoice.title.toLowerCase().trim();
        titleCompare = normAnswer === normCorrect;
        isCorrect = titleCompare;
      }
    }

    // Debug print
    if (window?.console) {
      console.log(
        "[CharacterMovieMatch][RECORD_ANSWER]",
        {
          user_answer: {
            id: selectedMovieObj?.id,
            idType: typeof selectedMovieObj?.id,
            title: selectedMovieObj?.title,
            titleType: typeof selectedMovieObj?.title,
          },
          correct: {
            id: correctChoice?.id,
            idType: typeof correctChoice?.id,
            title: correctChoice?.title,
            titleType: typeof correctChoice?.title,
          },
          idCompare,
          titleCompare,
          selectedMovieObj,
          correctChoice,
          result: isCorrect,
        }
      );
    }

    setUserAnswers(prev => [
      ...prev,
      {
        character: questions[step].clue,
        answerId: typeof selectedMovieObj.id !== "undefined" ? String(selectedMovieObj.id) : null,
        answerTitle: selectedMovieObj.title,
        answerPoster: selectedMovieObj.poster_path || null,
        wasCorrect: !!isCorrect,
        correctId: correctChoice?.id != null ? String(correctChoice.id) : null,
        correctTitle: correctChoice?.title || questions[step].correctMovie,
        correctPoster: correctChoice?.poster_path || null,
      }
    ]);
    setAnsweredIdx(null);
    setDragActive(false);
    setTimeout(() => {
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 450);
  }

  // Reveal/give up
  function handleReveal() {
    setReveal(true);
    setUserAnswers(prev => [
      ...prev,
      {
        character: questions[step].clue,
        answerTitle: "(revealed)",
        wasCorrect: false,
        correctTitle: questions[step].correctMovie,
        revealed: true
      }
    ]);
    setTimeout(() => {
      setReveal(false);
      if (step + 1 === QUESTIONS) setQuizOver(true);
      else setStep(step + 1);
    }, 1800);
  }

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 120 }}>
        Loading quiz...
      </div>
    );
  }

  if (quizOver) {
    return (
      <QuizResult
        score={userAnswers.filter(a => a.wasCorrect).length}
        total={QUESTIONS}
        answers={userAnswers}
        onHome={onBackToDashboard}
        game="Character-Movie Match"
      />
    );
  }

  // Defensive/fallback for missing question
  if (!questions[step]) {
    if (quizOver && userAnswers.length >= 1) {
      return (
        <QuizResult
          score={userAnswers.filter(a => a.wasCorrect).length}
          total={QUESTIONS}
          answers={userAnswers}
          onHome={onBackToDashboard}
          game="Character-Movie Match"
        />
      );
    }

    const fb = FALLBACK_QUESTIONS[0];
    if (userAnswers.length === QUESTIONS) {
      return (
        <QuizResult
          score={userAnswers.filter(a => a.wasCorrect).length}
          total={QUESTIONS}
          answers={userAnswers}
          onHome={onBackToDashboard}
          game="Character-Movie Match"
        />
      );
    }

    return (
      <div className="container" style={{ paddingTop: 100, marginBottom: 40 }}>
        <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
          ⬅ Back
        </button>
        <QuizProgress current={1} total={QUESTIONS} />
        <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
          Character-Movie Match (Fallback)
        </h2>
        <div className="description" style={{ marginBottom: 18 }}>
          Fallback: Drag the <b>character clue</b> onto the correct movie poster. (Demo Mode)
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              background: "#f6fcfc",
              color: "#1255ae",
              fontWeight: 600,
              fontSize: 28,
              borderRadius: 10,
              padding: "22px 34px",
              margin: "15px 0 20px 0",
              minWidth: 220,
              boxShadow: "0 0 12px #dde4fa",
              opacity: 1,
              cursor: "grab"
            }}
          >
            {fb.clue}
          </div>
          <div
            style={{
              display: "flex",
              gap: "32px",
              margin: "16px 0 24px 0",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
            {Array.isArray(fb.choices) && fb.choices.length > 0 ? (
              <React.Fragment>
                {fb.choices.map((movieObj, idx) => (
                  <div
                    key={movieObj.id || idx}
                    style={{
                      background: "#f7faff",
                      minWidth: 130,
                      minHeight: 210,
                      border: movieObj.title === fb.correctMovie ? "3px solid #2acd86" : "2px solid #bae8f7",
                      borderRadius: 12,
                      alignItems: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      fontSize: 19,
                      color: "#111",
                      fontWeight: 500,
                      margin: 6,
                      boxShadow: "0 3px 10px #ecf2fb",
                      position: "relative"
                    }}
                    tabIndex={0}
                    aria-label={`Demo poster for ${movieObj.title}`}
                  >
                    {movieObj.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${movieObj.poster_path}`}
                        alt={movieObj.title ? `Poster for ${movieObj.title}` : "Movie Poster"}
                        style={{
                          width: "110px",
                          height: "160px",
                          borderRadius: 7,
                          objectFit: "cover",
                          boxShadow: "0 4px 16px #b3d5ef33",
                          marginTop: 14,
                          marginBottom: 8,
                          border: "2px solid #cbeef3",
                          background: "#ebf5fb"
                        }}
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = "none";
                          const fallbackDiv = document.createElement("div");
                          fallbackDiv.textContent = "Poster Unavailable";
                          fallbackDiv.style.width = "110px";
                          fallbackDiv.style.height = "160px";
                          fallbackDiv.style.background = "#d3e0ea";
                          fallbackDiv.style.borderRadius = "6px";
                          fallbackDiv.style.marginTop = "14px";
                          fallbackDiv.style.display = "flex";
                          fallbackDiv.style.alignItems = "center";
                          fallbackDiv.style.justifyContent = "center";
                          fallbackDiv.style.color = "#678";
                          fallbackDiv.style.fontSize = "12px";
                          fallbackDiv.style.fontWeight = "500";
                          e.currentTarget.parentNode.appendChild(fallbackDiv);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 110, height: 160, background: "#d3e0ea",
                        borderRadius: 6, marginTop: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#678", fontSize: 12, fontWeight: 500
                      }}>
                        No Poster
                      </div>
                    )}
                    <div style={{
                      marginTop: 4, textAlign: "center", fontWeight: 600, fontSize: 16,
                      width: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      userSelect: "none", background: "rgba(245,250,250, 0.8)", borderRadius: 6, padding: "4px 0"
                    }}>
                      {movieObj.title}
                    </div>
                    {movieObj.title === fb.correctMovie && (
                      <span style={{
                        position: "absolute", right: 10, top: 10, fontSize: 32, color: "#2acd86"
                      }}>✔️</span>
                    )}
                  </div>
                ))}
              </React.Fragment>
            ) : (
              <div>No poster choices available.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal round UI ---
  const question = questions[step];

  return (
    <div className="container" style={{ paddingTop: 100, marginBottom: 40 }}>
      <button className="btn" style={{ marginBottom: 24 }} onClick={onBackToDashboard}>
        ⬅ Back
      </button>
      {usingFallback && (
        <div
          style={{
            background: "#fffbe2",
            color: "#bb8900",
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: 7,
            marginBottom: 12,
            boxShadow: "0 2px 11px #fedc8915, 0 0px 1px #fff6b3 inset",
            fontSize: 15
          }}
          aria-live="polite"
        >
          Fallback questions in use — TMDB data was unavailable. Posters and clues are from hardcoded demo set.
        </div>
      )}
      <QuizProgress current={step + 1} total={QUESTIONS} />
      <h2 className="title" style={{ fontSize: "1.65rem", marginBottom: 13 }}>
        Character-Movie Match
      </h2>
      <div className="description" style={{ marginBottom: 18 }}>
        Drag the <b>character clue</b> onto the correct movie poster.<br />
        {`(1 correct poster, ${CHOICES_PER_QUESTION - 1} decoy posters per round)`}
      </div>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center"
      }}>
        {/* DRAGGABLE CLUE */}
        <div
          style={{
            background: "#f6fcfc",
            color: "#1255ae",
            fontWeight: 600,
            fontSize: 28,
            borderRadius: 10,
            padding: "22px 34px",
            margin: "15px 0 20px 0",
            minWidth: 220,
            boxShadow: dragActive ? "0 0 16px #a7e6ec" : "0 0 8px #dde4fa",
            opacity: reveal ? 0.4 : 1,
            cursor: reveal ? "not-allowed" : "grab",
            transition: "box-shadow 0.18s, opacity 0.16s"
          }}
          draggable={!reveal}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {question.clue}
        </div>
        {/* POSTER CHOICES */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            margin: "16px 0 24px 0",
            justifyContent: "center",
            flexWrap: "wrap",
            opacity: reveal ? 0.4 : 1,
            pointerEvents: reveal ? "none" : "auto"
          }}
        >
          {Array.isArray(question.choices) && question.choices.length > 0 ? (
            <React.Fragment>
              {question.choices.map((movieObj, idx) => {
                if (window?.console) {
                  console.log(`[CharacterMovieMatch][Round=${step + 1}][Option=${idx}]`, {
                    title: movieObj.title,
                    poster_path: movieObj.poster_path,
                    TMDB_IMAGE_BASE,
                    url: movieObj.poster_path ? `${TMDB_IMAGE_BASE}${movieObj.poster_path}` : null,
                  });
                  if (!movieObj.poster_path) {
                    console.warn(`[CharacterMovieMatch][Round=${step + 1}][Option=${idx}] poster_path missing`, movieObj);
                  }
                }
                // Visual results: compute strict correctness for the tick/cross and border
                let isDropCorrect = false;
                if (
                  typeof question.correctMovieObj?.id !== "undefined" &&
                  typeof movieObj.id !== "undefined"
                ) {
                  isDropCorrect =
                    String(movieObj.id) === String(question.correctMovieObj.id);
                } else if (
                  typeof question.correctMovieObj?.title === "string" &&
                  typeof movieObj.title === "string"
                ) {
                  isDropCorrect =
                    movieObj.title.toLowerCase().trim() ===
                    question.correctMovieObj.title.toLowerCase().trim();
                }
                return (
                  <div
                    key={movieObj.id || idx}
                    onDrop={e => handleDropOnPoster(movieObj, idx, e)}
                    onDragOver={allowDrop}
                    onDragLeave={leaveDrop}
                    style={{
                      background: "#f7faff",
                      minWidth: 130,
                      minHeight: 210,
                      border: answeredIdx === idx
                        ? (isDropCorrect ? "3px solid #2acd86" : "3px solid #da364a")
                        : "2px solid #bae8f7",
                      borderRadius: 12,
                      alignItems: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      fontSize: 19,
                      color: "#111",
                      fontWeight: 500,
                      margin: 6,
                      cursor: dragActive && !reveal ? "pointer" : "default",
                      boxShadow: answeredIdx === idx
                        ? (isDropCorrect ? "0 0 18px #49f1b7" : "0 0 14px #ffb2bc")
                        : "0 3px 10px #ecf2fb",
                      opacity: dragActive ? 0.93 : 1,
                      position: "relative",
                      transition: "box-shadow 0.25s, border 0.21s, opacity 0.12s"
                    }}
                    tabIndex={0}
                    aria-label={`Drop character here for ${movieObj.title}`}
                  >
                    {movieObj.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${movieObj.poster_path}`}
                        alt={movieObj.title ? `Poster for ${movieObj.title}` : "Movie Poster"}
                        style={{
                          width: "110px",
                          height: "160px",
                          borderRadius: 7,
                          objectFit: "cover",
                          boxShadow: "0 4px 16px #b3d5ef33",
                          marginTop: 14,
                          marginBottom: 8,
                          border: "2px solid #cbeef3",
                          background: "#ebf5fb"
                        }}
                        loading="lazy"
                        onError={e => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = "none";
                          const fallbackDiv = document.createElement("div");
                          fallbackDiv.textContent = "Poster Unavailable";
                          fallbackDiv.style.width = "110px";
                          fallbackDiv.style.height = "160px";
                          fallbackDiv.style.background = "#d3e0ea";
                          fallbackDiv.style.borderRadius = "6px";
                          fallbackDiv.style.marginTop = "14px";
                          fallbackDiv.style.display = "flex";
                          fallbackDiv.style.alignItems = "center";
                          fallbackDiv.style.justifyContent = "center";
                          fallbackDiv.style.color = "#678";
                          fallbackDiv.style.fontSize = "12px";
                          fallbackDiv.style.fontWeight = "500";
                          e.currentTarget.parentNode.appendChild(fallbackDiv);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 110, height: 160, background: "#d3e0ea",
                        borderRadius: 6, marginTop: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#678", fontSize: 12, fontWeight: 500
                      }}>
                        No Poster
                      </div>
                    )}
                    <div style={{
                      marginTop: 4,
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 16,
                      width: 120,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      userSelect: "none",
                      background: "rgba(245,250,250, 0.8)",
                      borderRadius: 6,
                      padding: "4px 0"
                    }}>
                      {movieObj.title}
                    </div>
                    {answeredIdx === idx && (
                      <span style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                        fontSize: 32,
                        color: isDropCorrect ? "#2acd86" : "#ed2e40"
                      }}>
                        {isDropCorrect ? "✔️" : "✖️"}
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ) : (
            <div>No poster choices available.</div>
          )}
        </div>
        <button
          className="btn"
          style={{
            marginTop: 8, color: "#432", background: "#ffe14d",
            pointerEvents: reveal ? "none" : "auto"
          }}
          onClick={handleReveal}
          disabled={reveal}
        >
          Reveal Answer
        </button>
        {reveal && (
          <div style={{ marginTop: 23, color: "#ed3529", fontWeight: 700, fontSize: 18 }}>
            The correct answer: {question.correctMovie}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterMovieMatch;
