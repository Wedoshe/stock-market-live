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
      sunvolt: "The government contract increases SunVolt's expected business and future revenue.",
      fuelpower: "Greater dependence on solar energy reduces demand for traditional fuel.",
      foodrush: "Lower fuel costs reduce operating and cooking-related expenses, improving profits.",
      movemax: "Lower fuel costs reduce transportation expenses and encourage more vehicle use.",
      medicore: "The solar contract does not directly affect the healthcare sector.",
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
      sunvolt: "Higher fuel prices make solar power more attractive as an alternative energy source.",
      fuelpower: "Higher oil prices increase the value and revenue potential of fuel companies.",
      foodrush: "Higher fuel costs increase operating expenses, reducing expected profits.",
      movemax: "Higher fuel prices increase transportation costs and hurt the company's outlook.",
      medicore: "Oil prices have no major direct effect on healthcare demand.",
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
      sunvolt: "The shift toward EVs increases demand for electricity and supports renewable energy.",
      fuelpower: "The diesel ban reduces demand for traditional fuel and hurts fuel companies.",
      foodrush: "The policy has little direct effect on FoodRush's food business.",
      movemax: "Government support for EV operation increases demand while diesel competitors are restricted.",
      medicore: "The EV and diesel policy has no major direct effect on healthcare.",
    },
  },
  {
    id: 4,
    headline:
      "NEW VIRUS OUTBREAK — GOVERNMENT ANNOUNCES FULL LOCKDOWN",
    prices: {
      sunvolt: 190,
      fuelpower: 50,
      foodrush: 140,
      movemax: 70,
      medicore: 200,
    },
    reasons: {
      sunvolt: "Factories and offices close during lockdown, reducing overall energy demand.",
      fuelpower: "Vehicle use falls sharply during lockdown, reducing fuel demand.",
      foodrush: "People staying home increases demand for food delivery and online necessities.",
      movemax: "Travel and transportation restrictions severely reduce vehicle and transport activity.",
      medicore: "The outbreak creates higher healthcare demand and opportunities for vaccine development and supply.",
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

  const profitLoss = portfolioValue - startingPortfolioValue;

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

    if (
      !gameOver &&
      roundResults.length === 0
    ) {
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

    setPrices(currentRound.prices);

    setRoundResults((previous) => [
      ...previous,
      {
        round,
        prices: currentRound.prices,
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

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!draggingStock) return;

    currentX.current = event.clientX;

    const distance = currentX.current - startX.current;

    setDragX(Math.max(-150, Math.min(150, distance)));
  };

  const handlePointerUp = () => {
    if (!draggingStock) return;

    const distance = currentX.current - startX.current;

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
            { round: 0, value: STARTING_CASH },
            ...roundResults.map((item) => ({
              round: item.round,
              value: item.portfolioValue,
            })),
          ]
        : [{ round: 0, value: STARTING_CASH }];

    const width = 700;
    const height = 300;
    const padding = 40;

    const values = history.map((item) => item.value);

    const minValue = Math.min(...values, STARTING_CASH);
    const maxValue = Math.max(...values, STARTING_CASH);

    const range =
      maxValue - minValue === 0
        ? 1
        : maxValue - minValue;

    const points = history.map((item, index) => {
      const x =
        history.length === 1
          ? width / 2
          : padding +
            (index / (history.length - 1)) *
              (width - padding * 2);

      const y =
        height -
        padding -
        ((item.value - minValue) / range) *
          (height - padding * 2);

      return {
        ...item,
        x,
        y,
      };
    });

    const path = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

    return (
      <div className="graph-container">
        <svg
          className="portfolio-graph"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            className="graph-axis"
          />

          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            className="graph-axis"
          />

          <path
            d={path}
            fill="none"
            className="graph-line"
          />

          {points.map((point) => (
            <g key={point.round}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                className="graph-point"
              />

              <text
                x={point.x}
                y={height - 15}
                textAnchor="middle"
                className="graph-label"
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
        <div className="game-container final-screen">
          <div className="top-header">
            <h1>Stock Market Live</h1>
            <span className="market-status">
              MARKET CLOSED
            </span>
          </div>

          <div className="final-summary">
            <h2>Your Final Portfolio</h2>

            <div className="final-value">
              ₹{portfolioValue.toLocaleString("en-IN")}
            </div>

            <div
              className={
                profitLoss >= 0
                  ? "profit final-profit"
                  : "loss final-profit"
              }
            >
              {profitLoss >= 0 ? "+" : ""}
              ₹{profitLoss.toLocaleString("en-IN")}
            </div>

            <div className="final-label">
              {profitLoss >= 0
                ? "Profit"
                : "Loss"}
            </div>
          </div>

          {renderGraph()}

          <div className="final-holdings">
            {STOCKS.map((stock) => (
              <div
                className="final-stock"
                key={stock.id}
              >
                <div>
                  <strong>{stock.name}</strong>
                  <span>
                    {holdings[stock.id]} shares
                  </span>
                </div>

                <strong>
                  ₹
                  {(
                    holdings[stock.id] *
                    prices[stock.id]
                  ).toLocaleString("en-IN")}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <header className="top-header">
          <div>
            <h1>Stock Market Live</h1>
            <p>Round {round} of 4</p>
          </div>

          <div className="cash-display">
            ₹{cash.toLocaleString("en-IN")}
          </div>
        </header>

        <nav className="tabs">
          <button
            className={
              activeTab === "market"
                ? "tab active"
                : "tab"
            }
            onClick={() => setActiveTab("market")}
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

        {activeTab === "market" && (
          <main className="market-page">
            <div className="round-header">
              <div>
                <span className="round-number">
                  ROUND {round}
                </span>

                <h2>
                  {currentRound.headline}
                </h2>
              </div>

              <div
                className={
                  timeLeft <= 5
                    ? "timer danger"
                    : "timer"
                }
              >
                {timeLeft}s
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

            <div className="stock-list">
              {STOCKS.map((stock) => {
                const price =
                  prices[stock.id];

                const nextPrice =
                  currentRound.prices[
                    stock.id
                  ];

                const difference =
                  nextPrice - price;

                const direction =
                  difference > 0
                    ? "up"
                    : difference < 0
                    ? "down"
                    : "same";

                const isDragging =
                  draggingStock === stock.id;

                return (
                  <div
                    className="stock-wrapper"
                    key={stock.id}
                  >
                    <div
                      className={`stock-card ${
                        isDragging
                          ? "dragging"
                          : ""
                      }`}
                      style={{
                        transform: isDragging
                          ? `translateX(${dragX}px) rotate(${
                              dragX / 30
                            }deg)`
                          : "translateX(0)",
                      }}
                      onPointerDown={(event) =>
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
                      <div className="stock-main">
                        <div>
                          <h3>{stock.name}</h3>
                          <span className="sector">
                            {stock.sector}
                          </span>
                        </div>

                        <div className="stock-price">
                          ₹{price}
                        </div>
                      </div>

                      <div className="stock-bottom">
                        <div
                          className={`movement ${direction}`}
                        >
                          {difference > 0
                            ? `+₹${difference}`
                            : difference < 0
                            ? `-₹${Math.abs(
                                difference
                              )}`
                            : "₹0"}
                        </div>

                        <div className="owned">
                          {holdings[stock.id]} shares
                        </div>
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
                      <div className="reason">
                        {currentRound.reasons[
                          stock.id
                        ]}
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
              ) : (
                <>
                  <div className="locked-message">
                    DECISIONS LOCKED
                  </div>

                  {round <
                    ROUNDS.length && (
                    <button
                      className="next-button"
                      onClick={nextRound}
                    >
                      NEXT ROUND
                    </button>
                  )}
                </>
              )}
            </div>
          </main>
        )}

        {activeTab === "portfolio" && (
          <main className="portfolio-page">
            <div className="portfolio-summary">
              <span>
                CURRENT PORTFOLIO VALUE
              </span>

              <strong>
                ₹
                {portfolioValue.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <div
                className={
                  profitLoss >= 0
                    ? "profit"
                    : "loss"
                }
              >
                {profitLoss >= 0 ? "+" : ""}
                ₹
                {profitLoss.toLocaleString(
                  "en-IN"
                )}
              </div>
            </div>

            <h2>Portfolio Performance</h2>

            {renderGraph()}

            <div className="holdings-list">
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
          </main>
        )}

        {activeTab === "leaderboard" && (
          <main className="leaderboard-page">
            <h2>Leaderboard</h2>

            <div className="leaderboard-card">
              <div className="leaderboard-header">
                <span>Rank</span>
                <span>Investor</span>
                <span>Portfolio</span>
              </div>

              <div className="leaderboard-row">
                <strong>1</strong>
                <span>You</span>
                <strong>
                  ₹
                  {portfolioValue.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <div className="leaderboard-row">
                <strong>2</strong>
                <span>Player 2</span>
                <strong>₹10,000</strong>
              </div>

              <div className="leaderboard-row">
                <strong>3</strong>
                <span>Player 3</span>
                <strong>₹10,000</strong>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;