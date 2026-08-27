import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STARTING_CASH = 10000;
const ROUND_TIME = 30;

const STOCKS = [
  {
    id: "sunvolt",
    name: "SunVolt",
    sector: "Renewable Energy",
    initialPrice: 100,
  },
  {
    id: "fuelpower",
    name: "FuelPower",
    sector: "Energy",
    initialPrice: 100,
  },
  {
    id: "foodrush",
    name: "FoodRush",
    sector: "Food & Retail",
    initialPrice: 100,
  },
  {
    id: "movemax",
    name: "MoveMax",
    sector: "Transportation",
    initialPrice: 100,
  },
  {
    id: "medicore",
    name: "MediCore",
    sector: "Healthcare",
    initialPrice: 100,
  },
];

const ROUNDS = [
  {
    id: 1,
    headline: "SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT",
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        "The government contract increases SunVolt's expected business and future revenue.",
      fuelpower:
        "Greater dependence on solar energy reduces demand for traditional fuel.",
      foodrush:
        "Lower fuel costs reduce operating and cooking-related expenses, improving profits.",
      movemax:
        "Lower fuel costs reduce transportation expenses and encourage more vehicle use.",
      medicore:
        "The solar contract does not directly affect the healthcare sector.",
    },
  },

  {
    id: 2,
    headline: "GLOBAL OIL PRICES RISE SHARPLY",
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        "Higher fuel prices make solar power more attractive as an alternative energy source.",
      fuelpower:
        "Higher oil prices increase the value and revenue potential of fuel companies.",
      foodrush:
        "Higher fuel costs increase operating expenses, reducing expected profits.",
      movemax:
        "Higher fuel prices increase transportation costs and hurt the company's outlook.",
      medicore:
        "Oil prices have no major direct effect on healthcare demand.",
    },
  },

  {
    id: 3,
    headline:
      "GOVERNMENT BANS ENTRY OF DIESEL VEHICLES; EV VEHICLES WILL BE PAID TO OPERATE",
    prices: {
      sunvolt: 210,
      fuelpower: 80,
      foodrush: 100,
      movemax: 130,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        "The shift toward EVs increases demand for electricity and supports renewable energy.",
      fuelpower:
        "The diesel ban reduces demand for traditional fuel and hurts fuel companies.",
      foodrush:
        "The policy has little direct effect on FoodRush's food business.",
      movemax:
        "Government support for EV operation increases demand while diesel competitors are restricted.",
      medicore:
        "The EV and diesel policy has no major direct effect on healthcare.",
    },
  },

  {
    id: 4,
    headline:
      "GOVERNMENT ANNOUNCES PETROL PRICES CUT BY 50% TO HELP COMMON PEOPLE",
    prices: {
      sunvolt: 150,
      fuelpower: 25,
      foodrush: 170,
      movemax: 130,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        "Cheaper petrol makes traditional fuel more attractive, reducing demand for solar energy.",
      fuelpower:
        "The 50% petrol price cut reduces fuel prices and hurts the value of fuel companies.",
      foodrush:
        "Lower fuel costs reduce operating expenses, allowing FoodRush to earn higher profits.",
      movemax:
        "Cheaper petrol encourages more people to use vehicles, boosting transportation demand.",
      medicore:
        "The petrol price cut has no major direct effect on healthcare.",
    },
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("market");

  const [cash, setCash] = useState(STARTING_CASH);

  const [prices, setPrices] = useState(() => {
    const initial = {};

    STOCKS.forEach((stock) => {
      initial[stock.id] = stock.initialPrice;
    });

    return initial;
  });

  const [holdings, setHoldings] = useState(() => {
    const initial = {};

    STOCKS.forEach((stock) => {
      initial[stock.id] = 0;
    });

    return initial;
  });

  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [locked, setLocked] = useState(false);
  const [roundResults, setRoundResults] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const [draggingStock, setDraggingStock] = useState(null);
  const [dragX, setDragX] = useState(0);

  const startX = useRef(0);
  const currentX = useRef(0);

  const currentRound = ROUNDS[round - 1];

  const portfolioValue = useMemo(() => {
    return STOCKS.reduce(
      (total, stock) =>
        total + holdings[stock.id] * prices[stock.id],
      cash
    );
  }, [cash, holdings, prices]);

  const startingPortfolioValue = STARTING_CASH;

  const profitLoss =
    portfolioValue - startingPortfolioValue;

  const portfolioHistory = useMemo(() => {
    const history = [
      {
        round: 0,
        value: STARTING_CASH,
      },
    ];

    roundResults.forEach((result) => {
      history.push({
        round: result.round,
        value: result.portfolioValue,
      });
    });

    if (!gameOver && roundResults.length === 0) {
      history.push({
        round: 1,
        value: portfolioValue,
      });
    }

    return history;
  }, [roundResults, portfolioValue, gameOver]);

  useEffect(() => {
    if (locked || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          lockRound();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [locked, gameOver, round]);

  const lockRound = () => {
    if (locked || gameOver) return;

    setLocked(true);

    const revealedPrices = currentRound.prices;

    setPrices(revealedPrices);

    setRoundResults((previous) => [
      ...previous,
      {
        round,
        prices: revealedPrices,
        portfolioValue,
      },
    ]);

    if (round === ROUNDS.length) {
      setGameOver(true);
    }
  };

  const nextRound = () => {
    if (!locked || gameOver) return;

    if (round >= ROUNDS.length) {
      setGameOver(true);
      return;
    }

    const nextRoundNumber = round + 1;

    setRound(nextRoundNumber);
    setTimeLeft(ROUND_TIME);
    setLocked(false);
    setDragX(0);
    setActiveTab("market");
  };

  const buyOne = (stockId) => {
    if (locked || gameOver) return;

    const price = prices[stockId];

    if (cash < price) return;

    setCash((previous) => previous - price);

    setHoldings((previous) => ({
      ...previous,
      [stockId]: previous[stockId] + 1,
    }));
  };

  const sellOne = (stockId) => {
    if (locked || gameOver) return;

    if (holdings[stockId] <= 0) return;

    const price = prices[stockId];

    setCash((previous) => previous + price);

    setHoldings((previous) => ({
      ...previous,
      [stockId]: previous[stockId] - 1,
    }));
  };

  const handlePointerDown = (event, stockId) => {
    if (locked || gameOver) return;

    startX.current = event.clientX;
    currentX.current = event.clientX;

    setDraggingStock(stockId);

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const handlePointerMove = (event) => {
    if (!draggingStock) return;

    currentX.current = event.clientX;

    const distance =
      currentX.current - startX.current;

    setDragX(
      Math.max(-150, Math.min(150, distance))
    );
  };

  const handlePointerUp = () => {
    if (!draggingStock) return;

    const distance =
      currentX.current - startX.current;

    if (distance >= 80) {
      buyOne(draggingStock);
    } else if (distance <= -80) {
      sellOne(draggingStock);
    }

    setDraggingStock(null);
    setDragX(0);
  };

  const renderGraph = () => {
    const history =
      roundResults.length > 0
        ? [
            {
              round: 0,
              value: STARTING_CASH,
            },
            ...roundResults.map((item) => ({
              round: item.round,
              value: item.portfolioValue,
            })),
          ]
        : [
            {
              round: 0,
              value: STARTING_CASH,
            },
          ];

    const width = 700;
    const height = 300;
    const padding = 40;

    const values = history.map(
      (item) => item.value
    );

    const minValue = Math.min(
      ...values,
      STARTING_CASH
    );

    const maxValue = Math.max(
      ...values,
      STARTING_CASH
    );

    const range =
      maxValue - minValue === 0
        ? 1
        : maxValue - minValue;

    const points = history.map(
      (item, index) => {
        const x =
          history.length === 1
            ? width / 2
            : padding +
              (index /
                (history.length - 1)) *
                (width - padding * 2);

        const y =
          height -
          padding -
          ((item.value - minValue) /
            range) *
            (height - padding * 2);

        return {
          ...item,
          x,
          y,
        };
      }
    );

    const path = points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

    return (
      <div className="chart-container">
        <svg
          className="portfolio-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            className="chart-axis"
          />

          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            className="chart-axis"
          />

          <path
            d={path}
            className="chart-line"
          />

          {points.map((point) => (
            <g key={point.round}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                className="chart-dot"
              />

              <text
                x={point.x}
                y={height - 15}
                textAnchor="middle"
                className="chart-label"
              >
                {point.round === 0
                  ? "Start"
                  : `R${point.round}`}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (gameOver) {
    return (
      <div className="app">
        <div className="final-screen">
          <h1>Stock Market Live</h1>

          <div className="final-card">
            <span>FINAL PORTFOLIO VALUE</span>

            <strong>
              ₹
              {portfolioValue.toLocaleString(
                "en-IN"
              )}
            </strong>

            <div
              className={
                profitLoss >= 0
                  ? "positive final-profit"
                  : "negative final-profit"
              }
            >
              {profitLoss >= 0 ? "+" : ""}
              ₹
              {profitLoss.toLocaleString(
                "en-IN"
              )}
            </div>
          </div>

          <div className="final-chart">
            {renderGraph()}
          </div>

          <div className="holdings">
            {STOCKS.map((stock) => (
              <div
                className="holding-row"
                key={stock.id}
              >
                <div>
                  <strong>{stock.name}</strong>
                  <span>
                    {holdings[stock.id]} shares
                  </span>
                </div>

                <div>
                  <strong>
                    ₹
                    {(
                      holdings[stock.id] *
                      prices[stock.id]
                    ).toLocaleString("en-IN")}
                  </strong>

                  <span>
                    ₹{prices[stock.id]} / share
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="game-header">
        <div>
          <span className="game-label">
            STOCK MARKET LIVE
          </span>

          <h1>Stock Market Live</h1>

          <p>
            Round {round} of {ROUNDS.length}
          </p>
        </div>

        <div className="header-stats">
          <div>
            <span>CASH</span>
            <strong>
              ₹{cash.toLocaleString("en-IN")}
            </strong>
          </div>

          <div>
            <span>PORTFOLIO</span>
            <strong>
              ₹
              {portfolioValue.toLocaleString(
                "en-IN"
              )}
            </strong>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={
            activeTab === "market"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setActiveTab("market")
          }
        >
          Market
        </button>

        <button
          className={
            activeTab === "portfolio"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setActiveTab("portfolio")
          }
        >
          Portfolio
        </button>

        <button
          className={
            activeTab === "leaderboard"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setActiveTab("leaderboard")
          }
        >
          Leaderboard
        </button>
      </nav>

      <main className="game-main">
        {activeTab === "market" && (
          <>
            <div className="news-card">
              <span className="news-badge">
                ROUND {round} NEWS
              </span>

              <h2>
                {currentRound.headline}
              </h2>

              <p>
                Analyse the market and make
                your decisions before the timer
                ends.
              </p>
            </div>

            <div className="trading-status">
              <div>
                <span>ROUND</span>
                <strong>
                  {round} / {ROUNDS.length}
                </strong>
              </div>

              <div>
                <span>DECISIONS</span>
                <strong>
                  {locked
                    ? "LOCKED"
                    : "OPEN"}
                </strong>
              </div>

              <div className="timer-box">
                <span>TIME LEFT</span>
                <strong>
                  {timeLeft}s
                </strong>
              </div>
            </div>

            <div className="swipe-instructions">
              <span className="sell-guide">
                SWIPE LEFT TO SELL
              </span>

              <span className="hold-guide">
                HOLD
              </span>

              <span className="buy-guide">
                SWIPE RIGHT TO BUY
              </span>
            </div>

            <div className="trading-list">
              {STOCKS.map((stock) => {
                const price =
                  prices[stock.id];

                const nextPrice =
                  currentRound.prices[
                    stock.id
                  ];

                const difference =
                  nextPrice - price;

                const isDragging =
                  draggingStock ===
                  stock.id;

                return (
                  <div
                    className="swipe-wrapper"
                    key={stock.id}
                  >
                    <div className="swipe-hint buy-hint">
                      BUY
                    </div>

                    <div className="swipe-hint sell-hint">
                      SELL
                    </div>

                    <div
                      className={`trading-card ${
                        isDragging
                          ? dragX > 0
                            ? "selected-buy"
                            : dragX < 0
                            ? "selected-sell"
                            : ""
                          : ""
                      }`}
                      style={{
                        transform: isDragging
                          ? `translateX(${dragX}px) rotate(${
                              dragX / 30
                            }deg)`
                          : "translateX(0)",
                      }}
                      onPointerDown={(
                        event
                      ) =>
                        handlePointerDown(
                          event,
                          stock.id
                        )
                      }
                      onPointerMove={
                        handlePointerMove
                      }
                      onPointerUp={
                        handlePointerUp
                      }
                      onPointerCancel={
                        handlePointerUp
                      }
                    >
                      <div className="trading-card-top">
                        <div>
                          <strong>
                            {stock.name}
                          </strong>

                          <span>
                            {stock.sector}
                          </span>
                        </div>

                        <strong className="trading-price">
                          ₹{price}
                        </strong>
                      </div>

                      <div className="trading-card-middle">
                        <div>
                          <span>
                            YOUR HOLDINGS
                          </span>

                          <strong>
                            {
                              holdings[
                                stock.id
                              ]
                            }{" "}
                            shares
                          </strong>
                        </div>

                        <div>
                          <span>
                            NEXT PRICE
                          </span>

                          <strong
                            className={
                              difference > 0
                                ? "price-up"
                                : difference <
                                  0
                                ? "price-down"
                                : ""
                            }
                          >
                            ₹{nextPrice}
                          </strong>
                        </div>
                      </div>

                      <div className="hold-row">
                        <button
                          className={
                            "hold-button " +
                            (false
                              ? "active"
                              : "")
                          }
                          onPointerDown={(
                            event
                          ) =>
                            event.stopPropagation()
                          }
                          onClick={() => {}}
                        >
                          HOLD
                        </button>
                      </div>

                      {isDragging && (
                        <div
                          className={
                            dragX > 0
                              ? "swipe-overlay buy-overlay"
                              : dragX < 0
                              ? "swipe-overlay sell-overlay"
                              : "swipe-overlay"
                          }
                        >
                          {dragX > 0
                            ? "BUY"
                            : dragX < 0
                            ? "SELL"
                            : "HOLD"}
                        </div>
                      )}
                    </div>

                    {locked && (
                      <div className="reason-list">
                        <div className="reason-row">
                          <strong>
                            {stock.name}
                          </strong>

                          <p>
                            {
                              currentRound
                                .reasons[
                                stock.id
                              ]
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="lock-area">
              {!locked ? (
                <button
                  className="lock-button"
                  onClick={lockRound}
                >
                  LOCK DECISIONS
                </button>
              ) : round <
                ROUNDS.length ? (
                <button
                  className="primary-button"
                  onClick={nextRound}
                >
                  NEXT ROUND
                </button>
              ) : (
                <div className="locked-card">
                  <span className="lock-icon">
                    FINAL ROUND COMPLETE
                  </span>

                  <h2>
                    Market Closed
                  </h2>

                  <p>
                    Your final portfolio is
                    ready.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "portfolio" && (
          <main className="portfolio-page">
            <div className="portfolio-top">
              <div>
                <span className="section-label">
                  CURRENT PORTFOLIO VALUE
                </span>

                <h2>
                  ₹
                  {portfolioValue.toLocaleString(
                    "en-IN"
                  )}
                </h2>
              </div>

              <div
                className={
                  profitLoss >= 0
                    ? "profit-box positive"
                    : "profit-box negative"
                }
              >
                {profitLoss >= 0 ? "+" : ""}
                ₹
                {profitLoss.toLocaleString(
                  "en-IN"
                )}
              </div>
            </div>

            <div className="portfolio-chart">
              <div className="chart-heading">
                <span>
                  PORTFOLIO PERFORMANCE
                </span>

                <h2>
                  Growth by Round
                </h2>
              </div>

              {renderGraph()}
            </div>

            <div className="portfolio-stats">
              <div>
                <span>CASH</span>

                <strong>
                  ₹
                  {cash.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div>
                <span>PROFIT / LOSS</span>

                <strong
                  className={
                    profitLoss >= 0
                      ? "positive"
                      : "negative"
                  }
                >
                  {profitLoss >= 0
                    ? "+"
                    : ""}
                  ₹
                  {profitLoss.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>
            </div>

            <div className="holdings">
              {STOCKS.map((stock) => (
                <div
                  className="holding-row"
                  key={stock.id}
                >
                  <div>
                    <strong>
                      {stock.name}
                    </strong>

                    <span>
                      {holdings[stock.id]}{" "}
                      shares
                    </span>
                  </div>

                  <div>
                    <strong>
                      ₹
                      {(
                        holdings[
                          stock.id
                        ] *
                        prices[
                          stock.id
                        ]
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                    <span>
                      ₹
                      {prices[stock.id]}{" "}
                      / share
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {activeTab === "leaderboard" && (
          <main className="leaderboard">
            <div className="leaderboard-heading">
              <span className="section-label">
                MARKET RANKINGS
              </span>

              <h2>Leaderboard</h2>

              <p>
                Compare your portfolio with
                other investors.
              </p>
            </div>

            <div className="leaderboard-list">
              <div className="leaderboard-row your-score">
                <span className="rank">
                  1
                </span>

                <div className="player-name">
                  <strong>
                    You
                  </strong>

                  <span>
                    CURRENT PLAYER
                  </span>
                </div>

                <strong className="player-value">
                  ₹
                  {portfolioValue.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="leaderboard-row">
                <span className="rank">
                  2
                </span>

                <div className="player-name">
                  <strong>
                    Player 2
                  </strong>
                </div>

                <strong className="player-value">
                  ₹10,000
                </strong>
              </div>

              <div className="leaderboard-row">
                <span className="rank">
                  3
                </span>

                <div className="player-name">
                  <strong>
                    Player 3
                  </strong>
                </div>

                <strong className="player-value">
                  ₹10,000
                </strong>
              </div>
            </div>
          </main>
        )}
      </main>
    </div>
  );
}

export default App;