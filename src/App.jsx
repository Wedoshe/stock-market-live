import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

const STARTING_CAPITAL = 10000

const INITIAL_STOCKS = [
  {
    id: 'sunvolt',
    name: 'SunVolt',
    symbol: 'SUN',
    icon: '☀️',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'robonext',
    name: 'RoboNext',
    symbol: 'ROBO',
    icon: '🤖',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'foodrush',
    name: 'FoodRush',
    symbol: 'FOOD',
    icon: '🍔',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'movemax',
    name: 'MoveMax',
    symbol: 'MOVE',
    icon: '🚗',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'medicore',
    name: 'MediCore',
    symbol: 'MEDI',
    icon: '🏥',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
]

const ROUND_DATA = [
  {
    id: 1,
    type: 'breaking',
    title: 'BREAKING NEWS',
    news: 'SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT.',
    description:
      'A major government contract could significantly increase SunVolt’s future business.',
    decisionTime: 30,
    prices: {
      sunvolt: 125,
      robonext: 90,
      foodrush: 105,
      movemax: 85,
      medicore: 110,
    },
  },
  {
    id: 2,
    type: 'indirect',
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY.',
    description:
      'Think about which companies could be affected directly or indirectly by higher transportation and energy costs.',
    decisionTime: 30,
    prices: {
      sunvolt: 118,
      robonext: 95,
      foodrush: 108,
      movemax: 75,
      medicore: 114,
    },
  },
  {
    id: 3,
    type: 'crisis',
    title: 'MARKET ALERT!',
    news: 'A MAJOR GLOBAL ECONOMIC SHOCK CAUSES UNCERTAINTY ACROSS MARKETS.',
    description:
      'Markets are under pressure. Do you panic sell, hold your position, or buy the dip?',
    decisionTime: 30,
    prices: {
      sunvolt: 95,
      robonext: 72,
      foodrush: 82,
      movemax: 60,
      medicore: 88,
    },
  },
  {
    id: 4,
    type: 'final',
    title: 'FINAL CHALLENGE',
    news: 'ECONOMIC CONDITIONS BEGIN SHOWING SIGNS OF RECOVERY.',
    description:
      'Only one or two sectors benefit strongly. You have limited time to make your final moves.',
    decisionTime: 45,
    prices: {
      sunvolt: 115,
      robonext: 105,
      foodrush: 125,
      movemax: 90,
      medicore: 140,
    },
  },
]

function formatMoney(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function App() {
  // =========================
  // ACCOUNT
  // =========================

  const [currentPlayer, setCurrentPlayer] = useState(null)

  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // =========================
  // GAME
  // =========================

  const [gameStarted, setGameStarted] = useState(false)
  const [round, setRound] = useState(0)

  const [stocks, setStocks] = useState(
    INITIAL_STOCKS.map((stock) => ({ ...stock }))
  )

  const [cash, setCash] = useState(STARTING_CAPITAL)

  const [timer, setTimer] = useState(0)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [decisionLocked, setDecisionLocked] = useState(false)

  /*
    decisions now stores BOTH:
    action + quantity

    Example:
    {
      sunvolt: { action: 'BUY', quantity: 10 },
      robonext: { action: 'HOLD', quantity: 0 }
    }
  */
  const [decisions, setDecisions] = useState({})

  const [revealed, setRevealed] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)

  // =========================
  // LOAD PLAYER
  // =========================

  useEffect(() => {
    const savedPlayer = localStorage.getItem('stockMarketPlayer')

    if (savedPlayer) {
      try {
        setCurrentPlayer(JSON.parse(savedPlayer))
      } catch {
        localStorage.removeItem('stockMarketPlayer')
      }
    }
  }, [])

  // =========================
  // CREATE ACCOUNT
  // =========================

  const createAccount = async () => {
    const cleanUsername = username.trim()
    const cleanPin = pin.trim()

    if (!cleanUsername || !cleanPin) {
      setAuthMessage('Please enter a username and PIN.')
      return
    }

    if (cleanUsername.length < 3) {
      setAuthMessage('Username must be at least 3 characters.')
      return
    }

    if (cleanPin.length < 4) {
      setAuthMessage('PIN must be at least 4 characters.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('')

    try {
      const { data: existingPlayer, error: checkError } =
        await supabase
          .from('players')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle()

      if (checkError) throw checkError

      if (existingPlayer) {
        setAuthMessage(
          'That username already exists. Try logging in.'
        )
        return
      }

      const { data, error } = await supabase
        .from('players')
        .insert([
          {
            username: cleanUsername,
            pin: cleanPin,
            score: STARTING_CAPITAL,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setCurrentPlayer(data)

      localStorage.setItem(
        'stockMarketPlayer',
        JSON.stringify(data)
      )

      setUsername('')
      setPin('')
    } catch (error) {
      console.error(error)

      setAuthMessage(
        'Could not create the account. Please try again.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  // =========================
  // LOGIN
  // =========================

  const login = async () => {
    const cleanUsername = username.trim()
    const cleanPin = pin.trim()

    if (!cleanUsername || !cleanPin) {
      setAuthMessage('Please enter a username and PIN.')
      return
    }

    setAuthLoading(true)
    setAuthMessage('')

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('username', cleanUsername)
        .eq('pin', cleanPin)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setAuthMessage('Incorrect username or PIN.')
        return
      }

      setCurrentPlayer(data)

      localStorage.setItem(
        'stockMarketPlayer',
        JSON.stringify(data)
      )
    } catch (error) {
      console.error(error)
      setAuthMessage('Login failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  // =========================
  // RESET GAME
  // =========================

  const resetGame = () => {
    setGameStarted(false)
    setRound(0)

    setStocks(
      INITIAL_STOCKS.map((stock) => ({
        ...stock,
      }))
    )

    setCash(STARTING_CAPITAL)
    setTimer(0)
    setDecisionOpen(false)
    setDecisionLocked(false)
    setDecisions({})
    setRevealed(false)
    setGameFinished(false)
  }

  // =========================
  // LOGOUT
  // =========================

  const logout = () => {
    localStorage.removeItem('stockMarketPlayer')
    setCurrentPlayer(null)
    resetGame()
  }

  // =========================
  // START GAME
  // =========================

  const startGame = () => {
    resetGame()
    setGameStarted(true)
  }

  // =========================
  // CURRENT ROUND
  // =========================

  const currentRound =
    round > 0 ? ROUND_DATA[round - 1] : null

  // =========================
  // PORTFOLIO
  // =========================

  const stockValue = useMemo(() => {
    return stocks.reduce(
      (total, stock) =>
        total + stock.price * stock.shares,
      0
    )
  }, [stocks])

  const portfolioValue = cash + stockValue

  const profitLoss =
    portfolioValue - STARTING_CAPITAL

  // =========================
  // TIMER
  // =========================

  useEffect(() => {
    if (
      !decisionOpen ||
      decisionLocked ||
      timer <= 0
    ) {
      return
    }

    const interval = setInterval(() => {
      setTimer((previous) => {
        if (previous <= 1) {
          setDecisionLocked(true)
          setDecisionOpen(false)
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [decisionOpen, decisionLocked, timer])

  // =========================
  // START DECISION
  // =========================

  const startDecision = () => {
    if (!currentRound) return

    setDecisions({})
    setDecisionLocked(false)
    setRevealed(false)

    setTimer(currentRound.decisionTime)
    setDecisionOpen(true)
  }

  // =========================
  // UPDATE DECISION
  // =========================

  const updateDecision = (stockId, action, quantity = 0) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed
    ) {
      return
    }

    setDecisions((previous) => ({
      ...previous,
      [stockId]: {
        action,
        quantity,
      },
    }))
  }

  // =========================
  // BUY
  // =========================

  const buyShares = (stockId, quantity) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed ||
      quantity <= 0
    ) {
      return
    }

    const stock = stocks.find(
      (item) => item.id === stockId
    )

    if (!stock) return

    const totalCost = stock.price * quantity

    // Can't buy if player doesn't have enough money.
    if (totalCost > cash) {
      return
    }

    setCash((previousCash) =>
      previousCash - totalCost
    )

    setStocks((previousStocks) =>
      previousStocks.map((item) => {
        if (item.id !== stockId) {
          return item
        }

        const oldShares = item.shares
        const newShares = oldShares + quantity

        const oldInvestment =
          oldShares * item.avgPrice

        const newInvestment =
          oldInvestment + totalCost

        const newAveragePrice =
          newShares > 0
            ? newInvestment / newShares
            : 0

        return {
          ...item,
          shares: newShares,
          avgPrice: newAveragePrice,
        }
      })
    )

    updateDecision(
      stockId,
      'BUY',
      quantity
    )
  }

  // =========================
  // SELL
  // =========================

  const sellShares = (stockId, quantity) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed ||
      quantity <= 0
    ) {
      return
    }

    const stock = stocks.find(
      (item) => item.id === stockId
    )

    if (!stock) return

    // Can't sell more than owned.
    if (quantity > stock.shares) {
      return
    }

    const totalReceived =
      stock.price * quantity

    setCash((previousCash) =>
      previousCash + totalReceived
    )

    setStocks((previousStocks) =>
      previousStocks.map((item) => {
        if (item.id !== stockId) {
          return item
        }

        const newShares =
          item.shares - quantity

        return {
          ...item,
          shares: newShares,
          avgPrice:
            newShares === 0
              ? 0
              : item.avgPrice,
        }
      })
    )

    updateDecision(
      stockId,
      'SELL',
      quantity
    )
  }

  // =========================
  // HOLD
  // =========================

  const holdStock = (stockId) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed
    ) {
      return
    }

    updateDecision(
      stockId,
      'HOLD',
      0
    )
  }

  // =========================
  // LOCK DECISIONS
  // =========================

  const lockDecision = () => {
    setDecisionLocked(true)
    setDecisionOpen(false)
    setTimer(0)
  }

  // =========================
  // REVEAL MARKET
  // =========================

  const revealPrices = () => {
    if (!currentRound || revealed) {
      return
    }

    setDecisionLocked(true)
    setDecisionOpen(false)
    setTimer(0)

    setStocks((previousStocks) =>
      previousStocks.map((stock) => ({
        ...stock,
        price:
          currentRound.prices[stock.id] ??
          stock.price,
      }))
    )

    setRevealed(true)
  }

  // =========================
  // NEXT ROUND
  // =========================

  const nextRound = () => {
    if (round >= ROUND_DATA.length) {
      finishGame()
      return
    }

    setRound(
      (previous) => previous + 1
    )

    setDecisionLocked(false)
    setRevealed(false)
    setDecisions({})
    setTimer(0)
  }

  // =========================
  // FINISH GAME
  // =========================

  const finishGame = async () => {
    setGameFinished(true)

    if (!currentPlayer) return

    try {
      await supabase
        .from('players')
        .update({
          score: Math.round(portfolioValue),
        })
        .eq('id', currentPlayer.id)
    } catch (error) {
      console.error(error)
    }
  }

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!currentPlayer) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-logo">
              📈
            </div>

            <h1>StockMarket</h1>

            <p className="auth-subtitle">
              Learn. Trade. Think.
            </p>

            <div className="auth-tabs">
              <button
                className={
                  authMode === 'login'
                    ? 'auth-tab active'
                    : 'auth-tab'
                }
                onClick={() => {
                  setAuthMode('login')
                  setAuthMessage('')
                }}
              >
                Login
              </button>

              <button
                className={
                  authMode === 'create'
                    ? 'auth-tab active'
                    : 'auth-tab'
                }
                onClick={() => {
                  setAuthMode('create')
                  setAuthMessage('')
                }}
              >
                Create Account
              </button>
            </div>

            <div className="auth-form">
              <label>Username</label>

              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
              />

              <label>PIN</label>

              <input
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value)
                }
              />

              {authMessage && (
                <div className="auth-message">
                  {authMessage}
                </div>
              )}

              <button
                className="auth-submit"
                disabled={authLoading}
                onClick={
                  authMode === 'login'
                    ? login
                    : createAccount
                }
              >
                {authLoading
                  ? 'PLEASE WAIT...'
                  : authMode === 'login'
                  ? 'LOGIN'
                  : 'CREATE ACCOUNT'}
              </button>
            </div>

            <p className="auth-note">
              Your account identifies you on the leaderboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // GAME START
  // =========================

  if (!gameStarted) {
    return (
      <div className="app">
        <div className="game-start">
          <div className="game-logo">
            📈
          </div>

          <h1>STOCK MARKET LIVE</h1>

          <p className="player-welcome">
            Welcome,{' '}
            <strong>
              {currentPlayer.username}
            </strong>
          </p>

          <div className="starting-capital">
            <span>STARTING CAPITAL</span>

            <strong>
              {formatMoney(
                STARTING_CAPITAL
              )}
            </strong>
          </div>

          <div className="game-rules-preview">
            <div>
              📰
              <strong>Market News</strong>
              <span>React to information</span>
            </div>

            <div>
              ⏱️
              <strong>Timed Decisions</strong>
              <span>30 seconds</span>
            </div>

            <div>
              📊
              <strong>Hidden Prices</strong>
              <span>Think before trading</span>
            </div>

            <div>
              🏆
              <strong>Final Ranking</strong>
              <span>Highest portfolio wins</span>
            </div>
          </div>

          <button
            className="start-game-button"
            onClick={startGame}
          >
            START GAME →
          </button>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // FINAL SCREEN
  // =========================

  if (gameFinished) {
    return (
      <div className="app">
        <div className="final-screen">
          <div className="final-trophy">
            🏆
          </div>

          <h1>MARKET CLOSED</h1>

          <p>All trading has ended.</p>

          <div className="final-card">
            <span>FINAL PORTFOLIO VALUE</span>

            <strong>
              {formatMoney(
                portfolioValue
              )}
            </strong>

            <div
              className={
                profitLoss >= 0
                  ? 'final-profit positive'
                  : 'final-profit negative'
              }
            >
              {profitLoss >= 0
                ? '▲'
                : '▼'}{' '}
              {formatMoney(
                Math.abs(profitLoss)
              )}{' '}
              {profitLoss >= 0
                ? 'PROFIT'
                : 'LOSS'}
            </div>
          </div>

          <div className="lesson-card">
            <h2>
              💡 What did you learn?
            </h2>

            <p>
              <strong>
                Diversification
              </strong>
              <br />
              Putting everything into one company increases risk.
            </p>

            <p>
              <strong>
                Risk vs Reward
              </strong>
              <br />
              Riskier investments can have larger gains or losses.
            </p>

            <p>
              <strong>
                Market Information
              </strong>
              <br />
              News can influence investor expectations.
            </p>

            <p>
              <strong>
                Emotional Decisions
              </strong>
              <br />
              Panic can lead to poor decisions.
            </p>

            <p>
              <strong>
                Nobody Can Predict the Market Perfectly
              </strong>
            </p>
          </div>

          <button
            className="start-game-button"
            onClick={resetGame}
          >
            PLAY AGAIN
          </button>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // MARKET OPEN
  // =========================

  if (round === 0) {
    return (
      <div className="app">
        <header className="game-header">
          <div>
            <span className="game-label">
              STOCK MARKET LIVE
            </span>

            <h1>MARKET OPEN</h1>

            <p>
              Investor:{' '}
              <strong>
                {currentPlayer.username}
              </strong>
            </p>
          </div>

          <div className="header-stats">
            <div>
              <span>CASH</span>
              <strong>
                {formatMoney(cash)}
              </strong>
            </div>

            <div>
              <span>VALUE</span>
              <strong>
                {formatMoney(
                  portfolioValue
                )}
              </strong>
            </div>
          </div>
        </header>

        <main className="game-main">
          <section className="market-open-card">
            <div className="round-number">
              ROUND 1
            </div>

            <h2>
              📈 MARKET OPEN
            </h2>

            <p>
              Study the companies.
              The first news event is coming.
            </p>

            <div className="stock-grid">
              {stocks.map((stock) => (
                <div
                  className="stock-card"
                  key={stock.id}
                >
                  <span className="stock-icon">
                    {stock.icon}
                  </span>

                  <h3>
                    {stock.name}
                  </h3>

                  <span>
                    {stock.symbol}
                  </span>

                  <strong>
                    {formatMoney(
                      stock.price
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setRound(1)
              }
            >
              CONTINUE →
            </button>
          </section>
        </main>
      </div>
    )
  }

  // =========================
  // GAME ROUND
  // =========================

  return (
    <div className="app">
      <header className="game-header">
        <div>
          <span className="game-label">
            ROUND {round} / {ROUND_DATA.length}
          </span>

          <h1>
            {currentRound.title}
          </h1>

          <p>
            Investor:{' '}
            <strong>
              {currentPlayer.username}
            </strong>
          </p>
        </div>

        <div className="header-stats">
          <div>
            <span>💰 CASH</span>
            <strong>
              {formatMoney(cash)}
            </strong>
          </div>

          <div>
            <span>📊 VALUE</span>
            <strong>
              {formatMoney(
                portfolioValue
              )}
            </strong>
          </div>
        </div>
      </header>

      <main className="game-main">

        {/* NEWS */}

        <section
          className={`news-card ${currentRound.type}`}
        >
          <div className="news-badge">
            {currentRound.type === 'crisis'
              ? '🚨 MARKET ALERT'
              : currentRound.type === 'final'
              ? '🏁 FINAL CHALLENGE'
              : currentRound.type === 'indirect'
              ? '📰 MARKET INFORMATION'
              : '📰 BREAKING NEWS'}
          </div>

          <h2>
            {currentRound.news}
          </h2>

          <p>
            {currentRound.description}
          </p>
        </section>

        {/* START DECISION */}

        {!decisionOpen &&
          !decisionLocked &&
          !revealed && (
            <section className="decision-start">
              <div className="round-number">
                ROUND {round}
              </div>

              <h2>
                Ready to trade?
              </h2>

              <p>
                Read the news. Think fast.
                Prices stay hidden.
              </p>

              <button
                className="primary-button"
                onClick={startDecision}
              >
                START{' '}
                {currentRound.decisionTime}s TIMER
              </button>
            </section>
          )}

        {/* DECISION MODE */}

        {decisionOpen && (
          <section className="decision-section">

            {/* Compact status bar */}

            <div className="trading-status">
              <div className="timer-box">
                <span>TIME</span>
                <strong>
                  {timer}s
                </strong>
              </div>

              <div>
                <span>CASH</span>
                <strong>
                  {formatMoney(cash)}
                </strong>
              </div>

              <div>
                <span>PORTFOLIO</span>
                <strong>
                  {formatMoney(
                    portfolioValue
                  )}
                </strong>
              </div>
            </div>

            <div className="decision-heading">
              <div>
                <span className="round-number">
                  YOUR MOVE
                </span>

                <h2>
                  BUY • HOLD • SELL
                </h2>
              </div>

              <div className="timer-large">
                {timer}
              </div>
            </div>

            <div className="decision-grid">
              {stocks.map((stock) => {
                const selected =
                  decisions[stock.id]

                const selectedAction =
                  selected?.action

                const selectedQuantity =
                  selected?.quantity || 0

                const maxBuy =
                  Math.floor(
                    cash / stock.price
                  )

                return (
                  <div
                    className={
                      selectedAction
                        ? 'decision-card chosen'
                        : 'decision-card'
                    }
                    key={stock.id}
                  >

                    {/* COMPANY */}

                    <div className="decision-company">
                      <span className="decision-icon">
                        {stock.icon}
                      </span>

                      <div className="company-info">
                        <strong>
                          {stock.name}
                        </strong>

                        <span className="company-price">
                          {formatMoney(
                            stock.price
                          )}{' '}
                          / share
                        </span>

                        <span className="owned-count">
                          Owned:{' '}
                          <b>
                            {stock.shares}
                          </b>
                        </span>
                      </div>
                    </div>

                    {/* QUANTITY */}

                    <div className="quantity-area">
                      <span>
                        BUY / SELL QUANTITY
                      </span>

                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() => {
                            const current =
                              selectedQuantity

                            updateDecision(
                              stock.id,
                              selectedAction || 'BUY',
                              Math.max(
                                0,
                                current - 1
                              )
                            )
                          }}
                        >
                          −
                        </button>

                        <strong>
                          {selectedQuantity}
                        </strong>

                        <button
                          type="button"
                          onClick={() => {
                            const current =
                              selectedQuantity

                            const max =
                              selectedAction ===
                              'SELL'
                                ? stock.shares
                                : maxBuy

                            if (
                              current < max
                            ) {
                              updateDecision(
                                stock.id,
                                selectedAction ||
                                  'BUY',
                                current + 1
                              )
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="decision-buttons">

                      <button
                        type="button"
                        className={
                          selectedAction === 'BUY'
                            ? 'decision-button buy selected'
                            : 'decision-button buy'
                        }
                        disabled={
                          maxBuy <= 0
                        }
                        onClick={() => {
                          const quantity =
                            selectedAction ===
                            'BUY' &&
                            selectedQuantity > 0
                              ? selectedQuantity
                              : 1

                          if (
                            quantity <=
                            maxBuy
                          ) {
                            buyShares(
                              stock.id,
                              quantity
                            )
                          }
                        }}
                      >
                        {selectedAction ===
                          'BUY' &&
                        selectedQuantity > 0
                          ? `✓ BUY × ${selectedQuantity}`
                          : 'BUY'}
                      </button>

                      <button
                        type="button"
                        className={
                          selectedAction === 'HOLD'
                            ? 'decision-button hold selected'
                            : 'decision-button hold'
                        }
                        onClick={() =>
                          holdStock(
                            stock.id
                          )
                        }
                      >
                        {selectedAction ===
                        'HOLD'
                          ? '✓ HOLD'
                          : 'HOLD'}
                      </button>

                      <button
                        type="button"
                        className={
                          selectedAction === 'SELL'
                            ? 'decision-button sell selected'
                            : 'decision-button sell'
                        }
                        disabled={
                          stock.shares <= 0
                        }
                        onClick={() => {
                          const quantity =
                            selectedAction ===
                            'SELL' &&
                            selectedQuantity > 0
                              ? Math.min(
                                  selectedQuantity,
                                  stock.shares
                                )
                              : 1

                          if (
                            quantity <=
                            stock.shares
                          ) {
                            sellShares(
                              stock.id,
                              quantity
                            )
                          }
                        }}
                      >
                        {selectedAction ===
                          'SELL' &&
                        selectedQuantity > 0
                          ? `✓ SELL × ${selectedQuantity}`
                          : 'SELL'}
                      </button>
                    </div>

                    {/* SELECTED INFO */}

                    {selectedAction && (
                      <div className="selected-decision">
                        {selectedAction ===
                          'BUY' &&
                        selectedQuantity > 0 ? (
                          <>
                            Buying{' '}
                            <strong>
                              {selectedQuantity}
                            </strong>{' '}
                            shares
                          </>
                        ) : selectedAction ===
                          'SELL' &&
                          selectedQuantity > 0 ? (
                          <>
                            Selling{' '}
                            <strong>
                              {selectedQuantity}
                            </strong>{' '}
                            shares
                          </>
                        ) : (
                          <>
                            <strong>
                              HOLD
                            </strong>{' '}
                            position
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              className="lock-button"
              onClick={lockDecision}
            >
              🔒 LOCK DECISIONS
            </button>
          </section>
        )}

        {/* LOCKED */}

        {decisionLocked &&
          !revealed && (
            <section className="locked-card">
              <div>🔒</div>

              <h2>
                DECISION LOCKED!
              </h2>

              <p>
                Your choices are final.
              </p>

              <button
                className="primary-button"
                onClick={revealPrices}
              >
                REVEAL MARKET →
              </button>
            </section>
          )}

        {/* REVEAL */}

        {revealed && (
          <section className="reveal-section">

            <div className="reveal-title">
              📊 MARKET MOVES
            </div>

            <div className="price-table">
              <div className="price-row header-row">
                <span>STOCK</span>
                <span>BEFORE</span>
                <span>AFTER</span>
              </div>

              {stocks.map((stock) => {
                const before =
                  INITIAL_STOCKS.find(
                    (item) =>
                      item.id === stock.id
                  )?.price ?? 100

                const change =
                  stock.price - before

                return (
                  <div
                    className="price-row"
                    key={stock.id}
                  >
                    <span>
                      {stock.icon}{' '}
                      {stock.name}
                    </span>

                    <span>
                      {formatMoney(
                        before
                      )}
                    </span>

                    <span
                      className={
                        change >= 0
                          ? 'price-up'
                          : 'price-down'
                      }
                    >
                      {change >= 0
                        ? '▲ '
                        : '▼ '}
                      {formatMoney(
                        stock.price
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="portfolio-summary">
              <h2>
                YOUR PORTFOLIO
              </h2>

              <div className="summary-grid">
                <div>
                  <span>Cash</span>
                  <strong>
                    {formatMoney(cash)}
                  </strong>
                </div>

                <div>
                  <span>Shares</span>
                  <strong>
                    {formatMoney(
                      stockValue
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>
                    {formatMoney(
                      portfolioValue
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  profitLoss >= 0
                    ? 'round-profit positive'
                    : 'round-profit negative'
                }
              >
                {profitLoss >= 0
                  ? '▲'
                  : '▼'}{' '}
                {formatMoney(
                  Math.abs(
                    profitLoss
                  )
                )}{' '}
                overall
              </div>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                if (
                  round >=
                  ROUND_DATA.length
                ) {
                  finishGame()
                } else {
                  nextRound()
                }
              }}
            >
              {round >=
              ROUND_DATA.length
                ? 'MARKET CLOSED →'
                : 'NEXT ROUND →'}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App