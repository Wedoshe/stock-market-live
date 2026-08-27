import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

const STARTING_CAPITAL = 10000

const INITIAL_STOCKS = [
  {
    id: 'sunvolt',
    name: 'SunVolt',
    symbol: 'SUN',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'fuelpower',
    name: 'FuelPower',
    symbol: 'FUEL',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'foodrush',
    name: 'FoodRush',
    symbol: 'FOOD',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'movemax',
    name: 'MoveMax',
    symbol: 'MOVE',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
  {
    id: 'medicore',
    name: 'MediCore',
    symbol: 'MEDI',
    price: 100,
    shares: 0,
    avgPrice: 0,
  },
]

const ROUND_DATA = [
  {
    id: 1,
    title: 'BREAKING NEWS',
    news: 'SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
    reasons: {
      sunvolt: 'Major government contract increases future business and investor confidence.',
      fuelpower: 'Greater dependence on solar reduces demand for traditional fuel.',
      foodrush: 'Lower fuel costs reduce operating expenses and improve profits.',
      movemax: 'Lower fuel costs encourage more travel and reduce transport costs.',
      medicore: 'The announcement does not directly affect the healthcare sector.',
    },
  },
  {
    id: 2,
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY',
    decisionTime: 30,
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
    reasons: {
      sunvolt: 'Higher fuel prices increase demand for alternative energy such as solar.',
      fuelpower: 'Higher oil prices increase the value and revenue potential of fuel companies.',
      foodrush: 'Higher fuel costs increase operating expenses and reduce profits.',
      movemax: 'Higher fuel prices raise transportation costs and hurt the business.',
      medicore: 'Oil prices have no significant direct effect on healthcare demand.',
    },
  },
  {
    id: 3,
    title: 'GOVERNMENT ANNOUNCEMENT',
    news: 'GOVERNMENT ANNOUNCES PETROL PRICES CUT BY 50% TO HELP COMMON PEOPLE',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 25,
      foodrush: 170,
      movemax: 130,
      medicore: 200,
    },
    reasons: {
      sunvolt: 'Cheaper petrol makes people less dependent on solar-powered alternatives.',
      fuelpower: 'The 50% petrol price cut directly reduces fuel-sector prices.',
      foodrush: 'Lower fuel costs reduce operating expenses and improve food-company profits.',
      movemax: 'Cheaper petrol encourages more vehicle use and boosts transport demand.',
      medicore: 'The petrol price change does not directly affect healthcare.',
    },
  },
  {
    id: 4,
    title: 'MARKET ALERT',
    news: 'NEW VIRUS OUTBREAK — GOVERNMENT ANNOUNCES FULL LOCKDOWN',
    decisionTime: 30,
    prices: {
      sunvolt: 190,
      fuelpower: 50,
      foodrush: 140,
      movemax: 70,
      medicore: 200,
    },
    reasons: {
      sunvolt: 'Factories and offices close, reducing energy demand despite continued solar relevance.',
      fuelpower: 'People staying home means much less vehicle and fuel usage.',
      foodrush: 'People staying home increases demand for food delivery and essential online orders.',
      movemax: 'The lockdown sharply reduces vehicle and transport usage.',
      medicore: 'The outbreak increases healthcare demand and creates opportunities for medical products.',
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

  const [decisions, setDecisions] = useState({})

  const [revealed, setRevealed] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)

  // Portfolio value after every completed round.
  const [portfolioHistory, setPortfolioHistory] = useState([
    {
      round: 0,
      value: STARTING_CAPITAL,
    },
  ])

  // =========================
  // TABS
  // =========================

  const [activeTab, setActiveTab] = useState('market')

  // =========================
  // SWIPE
  // =========================

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  // =========================
  // LOAD SAVED PLAYER
  // =========================

  useEffect(() => {
    const savedPlayer = localStorage.getItem('stockMarketPlayer')

    if (!savedPlayer) return

    try {
      const parsedPlayer = JSON.parse(savedPlayer)

      if (parsedPlayer?.id && parsedPlayer?.username) {
        setCurrentPlayer(parsedPlayer)
      } else {
        localStorage.removeItem('stockMarketPlayer')
      }
    } catch {
      localStorage.removeItem('stockMarketPlayer')
    }
  }, [])

  // =========================
  // ACCOUNT HELPERS
  // =========================

  const showSupabaseError = (error, fallbackMessage) => {
    console.error('Supabase error:', error)

    if (!error) {
      setAuthMessage(fallbackMessage)
      return
    }

    if (error.code === '23505') {
      setAuthMessage(
        'That username already exists. Try a different username.'
      )
      return
    }

    if (error.code === '42501') {
      setAuthMessage(
        'Database permission blocked this action. Check the players table policies in Supabase.'
      )
      return
    }

    if (error.message) {
      setAuthMessage(`Database error: ${error.message}`)
      return
    }

    setAuthMessage(fallbackMessage)
  }

  // =========================
  // CREATE ACCOUNT
  // =========================

  const createAccount = async () => {
    const cleanUsername = username.trim()
    const cleanPin = pin.trim()

    setAuthMessage('')

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

    try {
      const {
        data: existingPlayer,
        error: checkError,
      } = await supabase
        .from('players')
        .select('id, username')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (checkError) {
        showSupabaseError(
          checkError,
          'Could not check the username.'
        )
        return
      }

      if (existingPlayer) {
        setAuthMessage(
          'That username already exists. Try logging in.'
        )
        return
      }

      const {
        data: newPlayer,
        error: insertError,
      } = await supabase
        .from('players')
        .insert({
          username: cleanUsername,
          pin: cleanPin,
          score: STARTING_CAPITAL,
        })
        .select()
        .single()

      if (insertError) {
        showSupabaseError(
          insertError,
          'Could not create the account.'
        )
        return
      }

      if (!newPlayer) {
        setAuthMessage(
          'Account creation succeeded, but no player data was returned.'
        )
        return
      }

      setCurrentPlayer(newPlayer)

      localStorage.setItem(
        'stockMarketPlayer',
        JSON.stringify(newPlayer)
      )

      setUsername('')
      setPin('')
      setAuthMessage('')
    } catch (error) {
      console.error('Create account error:', error)

      setAuthMessage(
        error?.message
          ? `Error: ${error.message}`
          : 'Could not create the account. Please try again.'
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

    setAuthMessage('')

    if (!cleanUsername || !cleanPin) {
      setAuthMessage('Please enter a username and PIN.')
      return
    }

    setAuthLoading(true)

    try {
      const {
        data: player,
        error: loginError,
      } = await supabase
        .from('players')
        .select('*')
        .eq('username', cleanUsername)
        .eq('pin', cleanPin)
        .maybeSingle()

      if (loginError) {
        showSupabaseError(
          loginError,
          'Login failed. Please try again.'
        )
        return
      }

      if (!player) {
        setAuthMessage('Incorrect username or PIN.')
        return
      }

      setCurrentPlayer(player)

      localStorage.setItem(
        'stockMarketPlayer',
        JSON.stringify(player)
      )

      setUsername('')
      setPin('')
      setAuthMessage('')
    } catch (error) {
      console.error('Login error:', error)

      setAuthMessage(
        error?.message
          ? `Error: ${error.message}`
          : 'Login failed. Please try again.'
      )
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
    setPortfolioHistory([
      {
        round: 0,
        value: STARTING_CAPITAL,
      },
    ])
    setActiveTab('market')
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

  const updateDecision = (
    stockId,
    action,
    quantity = 0
  ) => {
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
  // BUY SHARES
  // =========================

  const buyShares = (stockId, quantity = 1) => {
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

    const totalCost =
      stock.price * quantity

    if (totalCost > cash) {
      return
    }

    setCash(
      (previousCash) =>
        previousCash - totalCost
    )

    setStocks((previousStocks) =>
      previousStocks.map((item) => {
        if (item.id !== stockId) {
          return item
        }

        const oldShares = item.shares
        const newShares =
          oldShares + quantity

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
  // SELL SHARES
  // =========================

  const sellShares = (
    stockId,
    quantity = 1
  ) => {
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

    if (quantity > stock.shares) {
      return
    }

    const totalReceived =
      stock.price * quantity

    setCash(
      (previousCash) =>
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
  // SWIPE HANDLERS
  // =========================

  const handleTouchStart = (event) => {
    const touch = event.touches[0]

    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (event, stock) => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return
    }

    const touch = event.changedTouches[0]

    const deltaX =
      touch.clientX - touchStartX.current

    const deltaY =
      touch.clientY - touchStartY.current

    touchStartX.current = null
    touchStartY.current = null

    // Ignore mostly vertical movement.
    if (Math.abs(deltaX) < 70) return
    if (Math.abs(deltaY) > Math.abs(deltaX)) return

    if (
      !decisionOpen ||
      decisionLocked ||
      revealed
    ) {
      return
    }

    if (deltaX > 0) {
      if (cash >= stock.price) {
        buyShares(stock.id, 1)
      }
    } else {
      if (stock.shares > 0) {
        sellShares(stock.id, 1)
      }
    }
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

    const newStocks = stocks.map((stock) => ({
      ...stock,
      price:
        currentRound.prices[stock.id] ??
        stock.price,
    }))

    setStocks(newStocks)

    const newStockValue = newStocks.reduce(
      (total, stock) =>
        total + stock.price * stock.shares,
      0
    )

    const newPortfolioValue =
      cash + newStockValue

    setPortfolioHistory((previous) => {
      const existing = previous.find(
        (item) => item.round === round
      )

      if (existing) {
        return previous.map((item) =>
          item.round === round
            ? {
                round,
                value: newPortfolioValue,
              }
            : item
        )
      }

      return [
        ...previous,
        {
          round,
          value: newPortfolioValue,
        },
      ]
    })

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
      (previous) =>
        previous + 1
    )

    setDecisionLocked(false)
    setRevealed(false)
    setDecisions({})
    setTimer(0)
    setActiveTab('market')
  }

  // =========================
  // FINISH GAME
  // =========================

  const finishGame = async () => {
    setGameFinished(true)

    if (!currentPlayer?.id) {
      return
    }

    try {
      const {
        error,
      } = await supabase
        .from('players')
        .update({
          score: Math.round(
            portfolioValue
          ),
        })
        .eq(
          'id',
          currentPlayer.id
        )

      if (error) {
        console.error(
          'Could not save final score:',
          error
        )
      }
    } catch (error) {
      console.error(
        'Could not save final score:',
        error
      )
    }
  }

  // =========================
  // LEADERBOARD
  // =========================

  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] =
    useState(false)

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true)

    try {
      const {
        data,
        error,
      } = await supabase
        .from('players')
        .select('id, username, score')
        .order('score', {
          ascending: false,
        })

      if (error) {
        console.error(
          'Leaderboard error:',
          error
        )
        return
      }

      setLeaderboard(data || [])
    } catch (error) {
      console.error(
        'Leaderboard error:',
        error
      )
    } finally {
      setLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    if (
      activeTab === 'leaderboard' &&
      currentPlayer
    ) {
      loadLeaderboard()
    }
  }, [activeTab, currentPlayer])

  // =========================
  // GRAPH
  // =========================

  const graph = useMemo(() => {
    const width = 900
    const height = 300
    const padding = 35

    const values = portfolioHistory.map(
      (item) => item.value
    )

    if (values.length === 0) {
      return null
    }

    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    const range =
      maxValue - minValue || 1

    const points = portfolioHistory.map(
      (item, index) => {
        const x =
          padding +
          (index /
            Math.max(
              portfolioHistory.length - 1,
              1
            )) *
            (width - padding * 2)

        const y =
          height -
          padding -
          ((item.value - minValue) /
            range) *
            (height - padding * 2)

        return {
          x,
          y,
          round: item.round,
          value: item.value,
        }
      }
    )

    const linePoints = points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(' ')

    return {
      width,
      height,
      points,
      linePoints,
    }
  }, [portfolioHistory])

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!currentPlayer) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">

            <div className="auth-logo">
              +
            </div>

            <h1>
              StockMarket
            </h1>

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

              <label>
                Username
              </label>

              <input
                type="text"
                placeholder="Enter username"
                value={username}
                autoComplete="username"
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    authMode === 'login'
                      ? login()
                      : createAccount()
                  }
                }}
              />

              <label>
                PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                placeholder="Enter PIN"
                value={pin}
                autoComplete={
                  authMode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                onChange={(event) =>
                  setPin(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    authMode === 'login'
                      ? login()
                      : createAccount()
                  }
                }}
              />

              {authMessage && (
                <div className="auth-message">
                  {authMessage}
                </div>
              )}

              <button
                className="auth-submit"
                disabled={
                  authLoading
                }
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
              Your account identifies you
              on the leaderboard.
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
            +
          </div>

          <h1>
            STOCK MARKET LIVE
          </h1>

          <p className="player-welcome">
            Welcome,{' '}
            <strong>
              {currentPlayer.username}
            </strong>
          </p>

          <div className="starting-capital">
            <span>
              STARTING CAPITAL
            </span>

            <strong>
              {formatMoney(
                STARTING_CAPITAL
              )}
            </strong>
          </div>

          <div className="game-rules-preview">

            <div>
              <strong>
                MARKET NEWS
              </strong>
              <span>
                React to information
              </span>
            </div>

            <div>
              <strong>
                TIMED DECISIONS
              </strong>
              <span>
                30 seconds
              </span>
            </div>

            <div>
              <strong>
                HIDDEN PRICES
              </strong>
              <span>
                Think before trading
              </span>
            </div>

            <div>
              <strong>
                FINAL RANKING
              </strong>
              <span>
                Highest portfolio wins
              </span>
            </div>

          </div>

          <button
            className="start-game-button"
            onClick={startGame}
          >
            START GAME
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

        <header className="game-header">

          <div>
            <span className="game-label">
              STOCK MARKET LIVE
            </span>

            <h1>
              MARKET CLOSED
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
              <span>
                FINAL VALUE
              </span>

              <strong>
                {formatMoney(
                  portfolioValue
                )}
              </strong>
            </div>
          </div>

        </header>

        <main className="game-main final-main">

          <section className="final-card">

            <span>
              FINAL PORTFOLIO VALUE
            </span>

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
                Math.abs(
                  profitLoss
                )
              )}{' '}
              {profitLoss >= 0
                ? 'PROFIT'
                : 'LOSS'}
            </div>

          </section>

          <section className="portfolio-chart final-chart">

            <h2>
              PORTFOLIO PERFORMANCE
            </h2>

            <p>
              Portfolio value after each completed round.
            </p>

            <div className="chart-container">

              {graph && (
                <svg
                  className="portfolio-svg"
                  viewBox={`0 0 ${graph.width} ${graph.height}`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={graph.linePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {graph.points.map(
                    (point) => (
                      <g
                        key={point.round}
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="7"
                          fill="currentColor"
                        />

                        <text
                          x={point.x}
                          y={
                            point.y -
                            14
                          }
                          textAnchor="middle"
                          className="graph-label"
                        >
                          R{point.round}
                        </text>
                      </g>
                    )
                  )}
                </svg>
              )}

            </div>

            <div className="chart-values">

              {portfolioHistory.map(
                (item) => (
                  <span
                    key={item.round}
                  >
                    Round {item.round}:{' '}
                    <strong>
                      {formatMoney(
                        item.value
                      )}
                    </strong>
                  </span>
                )
              )}

            </div>

          </section>

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

        </main>

      </div>
    )
  }

  // =========================
  // MAIN GAME
  // =========================

  return (
    <div className="app">

      <header className="game-header">

        <div>

          <span className="game-label">
            STOCK MARKET LIVE
          </span>

          <h1>
            {round === 0
              ? 'MARKET OPEN'
              : `ROUND ${round} / ${ROUND_DATA.length}`}
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
            <span>
              CASH
            </span>

            <strong>
              {formatMoney(cash)}
            </strong>
          </div>

          <div>
            <span>
              VALUE
            </span>

            <strong>
              {formatMoney(
                portfolioValue
              )}
            </strong>
          </div>

        </div>

      </header>

      {/* TABS */}

      <nav className="tabs">

        <button
          className={
            activeTab === 'market'
              ? 'tab active'
              : 'tab'
          }
          onClick={() =>
            setActiveTab('market')
          }
        >
          MARKET
        </button>

        <button
          className={
            activeTab === 'portfolio'
              ? 'tab active'
              : 'tab'
          }
          onClick={() =>
            setActiveTab('portfolio')
          }
        >
          PORTFOLIO
        </button>

        <button
          className={
            activeTab === 'leaderboard'
              ? 'tab active'
              : 'tab'
          }
          onClick={() =>
            setActiveTab('leaderboard')
          }
        >
          LEADERBOARD
        </button>

      </nav>

      <main className="game-main">

        {/* =========================
            MARKET TAB
        ========================= */}

        {activeTab === 'market' && (

          <>
            {/* MARKET OPEN */}

            {round === 0 && (
              <section className="market-open-card">

                <div className="round-number">
                  ROUND 1
                </div>

                <h2>
                  MARKET OPEN
                </h2>

                <p>
                  Study the companies before
                  the first market event.
                </p>

                <div className="stock-grid">

                  {stocks.map((stock) => (
                    <div
                      className="stock-card"
                      key={stock.id}
                    >

                      <div className="stock-info">
                        <div className="stock-icon">
                          {stock.symbol}
                        </div>

                        <div>
                          <h3>
                            {stock.name}
                          </h3>

                          <p>
                            {stock.symbol}
                          </p>
                        </div>
                      </div>

                      <div className="stock-price">
                        <strong>
                          {formatMoney(
                            stock.price
                          )}
                        </strong>
                      </div>

                    </div>
                  ))}

                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setRound(1)
                  }
                >
                  CONTINUE
                </button>

              </section>
            )}

            {/* CURRENT ROUND */}

            {round > 0 && currentRound && (

              <>

                <section className="news-card">

                  <div className="news-badge">
                    {currentRound.title}
                  </div>

                  <h2>
                    {currentRound.news}
                  </h2>

                </section>

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
                        Swipe right to buy.
                        Swipe left to sell.
                        Hold if you want to keep your position.
                      </p>

                      <button
                        className="primary-button"
                        onClick={
                          startDecision
                        }
                      >
                        START 30s TIMER
                      </button>

                    </section>
                  )}

                {decisionOpen && (

                  <section className="decision-section">

                    <div className="trading-status">

                      <div className="timer-box">
                        <span>
                          TIME
                        </span>

                        <strong>
                          {timer}s
                        </strong>
                      </div>

                      <div>
                        <span>
                          CASH
                        </span>

                        <strong>
                          {formatMoney(
                            cash
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          PORTFOLIO
                        </span>

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
                          TRADE
                        </h2>
                      </div>

                      <div className="timer-large">
                        {timer}
                      </div>

                    </div>

                    <div className="swipe-help">

                      <span className="swipe-sell">
                        SWIPE LEFT TO SELL
                      </span>

                      <span>
                        HOLD
                      </span>

                      <span className="swipe-buy">
                        SWIPE RIGHT TO BUY
                      </span>

                    </div>

                    <div className="decision-grid">

                      {stocks.map((stock) => {

                        const selected =
                          decisions[
                            stock.id
                          ]

                        const selectedAction =
                          selected?.action

                        const selectedQuantity =
                          selected?.quantity ||
                          0

                        const maxBuy =
                          Math.floor(
                            cash /
                              stock.price
                          )

                        return (

                          <div
                            className={
                              selectedAction
                                ? 'decision-card chosen'
                                : 'decision-card'
                            }
                            key={stock.id}
                            onTouchStart={
                              handleTouchStart
                            }
                            onTouchEnd={(
                              event
                            ) =>
                              handleTouchEnd(
                                event,
                                stock
                              )
                            }
                          >

                            <div className="swipe-track">
                              <span>
                                SELL
                              </span>

                              <span>
                                SWIPE
                              </span>

                              <span>
                                BUY
                              </span>
                            </div>

                            <div className="decision-company">

                              <div className="decision-icon">
                                {stock.symbol}
                              </div>

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
                                    {
                                      stock.shares
                                    }
                                  </b>
                                </span>

                              </div>

                            </div>

                            <div className="quantity-area">

                              <span>
                                QUANTITY
                              </span>

                              <div className="quantity-controls">

                                <button
                                  type="button"
                                  disabled={
                                    selectedQuantity <=
                                    0
                                  }
                                  onClick={() => {

                                    const newQuantity =
                                      Math.max(
                                        0,
                                        selectedQuantity -
                                          1
                                      )

                                    updateDecision(
                                      stock.id,
                                      selectedAction ||
                                        'BUY',
                                      newQuantity
                                    )
                                  }}
                                >
                                  -
                                </button>

                                <strong>
                                  {
                                    selectedQuantity
                                  }
                                </strong>

                                <button
                                  type="button"
                                  onClick={() => {

                                    const max =
                                      selectedAction ===
                                      'SELL'
                                        ? stock.shares
                                        : maxBuy

                                    if (
                                      selectedQuantity <
                                      max
                                    ) {
                                      updateDecision(
                                        stock.id,
                                        selectedAction ||
                                          'BUY',
                                        selectedQuantity +
                                          1
                                      )
                                    }
                                  }}
                                >
                                  +
                                </button>

                              </div>

                            </div>

                            <div className="decision-buttons">

                              <button
                                type="button"
                                className={
                                  selectedAction ===
                                  'BUY'
                                    ? 'decision-button buy selected'
                                    : 'decision-button buy'
                                }
                                disabled={
                                  maxBuy <=
                                  0
                                }
                                onClick={() =>
                                  buyShares(
                                    stock.id,
                                    1
                                  )
                                }
                              >
                                BUY
                              </button>

                              <button
                                type="button"
                                className={
                                  selectedAction ===
                                  'HOLD'
                                    ? 'decision-button hold selected'
                                    : 'decision-button hold'
                                }
                                onClick={() =>
                                  holdStock(
                                    stock.id
                                  )
                                }
                              >
                                HOLD
                              </button>

                              <button
                                type="button"
                                className={
                                  selectedAction ===
                                  'SELL'
                                    ? 'decision-button sell selected'
                                    : 'decision-button sell'
                                }
                                disabled={
                                  stock.shares <=
                                  0
                                }
                                onClick={() =>
                                  sellShares(
                                    stock.id,
                                    1
                                  )
                                }
                              >
                                SELL
                              </button>

                            </div>

                            {selectedAction && (
                              <div className="selected-decision">

                                {selectedAction ===
                                  'BUY' &&
                                selectedQuantity >
                                  0
                                  ? `Buying ${selectedQuantity} share${selectedQuantity === 1 ? '' : 's'}`
                                  : selectedAction ===
                                      'SELL' &&
                                    selectedQuantity >
                                      0
                                  ? `Selling ${selectedQuantity} share${selectedQuantity === 1 ? '' : 's'}`
                                  : 'Holding position'}

                              </div>
                            )}

                          </div>
                        )
                      })}

                    </div>

                    <button
                      className="lock-button"
                      onClick={
                        lockDecision
                      }
                    >
                      LOCK DECISIONS
                    </button>

                  </section>
                )}

                {decisionLocked &&
                  !revealed && (
                    <section className="locked-card">

                      <div className="locked-icon">
                        LOCKED
                      </div>

                      <h2>
                        DECISIONS LOCKED
                      </h2>

                      <p>
                        Your choices are final.
                      </p>

                      <button
                        className="primary-button"
                        onClick={
                          revealPrices
                        }
                      >
                        REVEAL MARKET
                      </button>

                    </section>
                  )}

                {revealed && (

                  <section className="reveal-section">

                    <div className="reveal-title">
                      MARKET MOVES
                    </div>

                    <div className="price-table">

                      <div className="price-row header-row">
                        <span>
                          STOCK
                        </span>

                        <span>
                          BEFORE
                        </span>

                        <span>
                          AFTER
                        </span>
                      </div>

                      {stocks.map((stock) => {

                        const before =
                          currentRound.id === 1
                            ? 100
                            : ROUND_DATA[
                                currentRound.id -
                                  2
                              ].prices[
                                stock.id
                              ]

                        const change =
                          stock.price -
                          before

                        return (

                          <div
                            className="price-row"
                            key={stock.id}
                          >

                            <span>
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

                    <div className="round-reasons">

                      <h2>
                        WHY THE MARKET MOVED
                      </h2>

                      {stocks.map(
                        (stock) => (
                          <div
                            className="reason-row"
                            key={stock.id}
                          >
                            <strong>
                              {stock.name}
                            </strong>

                            <span>
                              {
                                currentRound
                                  .reasons[
                                  stock.id
                                ]
                              }
                            </span>
                          </div>
                        )
                      )}

                    </div>

                    <div className="portfolio-summary">

                      <h2>
                        YOUR PORTFOLIO
                      </h2>

                      <div className="summary-grid">

                        <div>
                          <span>
                            Cash
                          </span>

                          <strong>
                            {formatMoney(
                              cash
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Shares
                          </span>

                          <strong>
                            {formatMoney(
                              stockValue
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Total
                          </span>

                          <strong>
                            {formatMoney(
                              portfolioValue
                            )}
                          </strong>
                        </div>

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
                        ? 'MARKET CLOSED'
                        : 'NEXT ROUND'}
                    </button>

                  </section>
                )}

              </>
            )}

          </>
        )}

        {/* =========================
            PORTFOLIO TAB
        ========================= */}

        {activeTab === 'portfolio' && (

          <section className="portfolio-page">

            <div className="portfolio-header">

              <div>
                <span className="game-label">
                  YOUR PORTFOLIO
                </span>

                <h2>
                  {formatMoney(
                    portfolioValue
                  )}
                </h2>
              </div>

              <div
                className={
                  profitLoss >= 0
                    ? 'portfolio-profit positive'
                    : 'portfolio-profit negative'
                }
              >
                {profitLoss >= 0
                  ? '+'
                  : '-'}
                {formatMoney(
                  Math.abs(
                    profitLoss
                  )
                )}
              </div>

            </div>

            <section className="portfolio-chart">

              <h2>
                PERFORMANCE
              </h2>

              <p>
                Portfolio value after each round.
              </p>

              <div className="chart-container">

                {graph && (
                  <svg
                    className="portfolio-svg"
                    viewBox={`0 0 ${graph.width} ${graph.height}`}
                    preserveAspectRatio="none"
                  >
                    <polyline
                      points={
                        graph.linePoints
                      }
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {graph.points.map(
                      (point) => (
                        <g
                          key={point.round}
                        >
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="7"
                            fill="currentColor"
                          />

                          <text
                            x={point.x}
                            y={
                              point.y -
                              14
                            }
                            textAnchor="middle"
                            className="graph-label"
                          >
                            R{point.round}
                          </text>
                        </g>
                      )
                    )}
                  </svg>
                )}

              </div>

              <div className="chart-values">

                {portfolioHistory.map(
                  (item) => (
                    <span
                      key={item.round}
                    >
                      Round {item.round}:{' '}
                      <strong>
                        {formatMoney(
                          item.value
                        )}
                      </strong>
                    </span>
                  )
                )}

              </div>

            </section>

            <section className="market">

              <div className="market-header">

                <h2>
                  HOLDINGS
                </h2>

              </div>

              <div className="stock-list">

                {stocks.map((stock) => (

                  <div
                    className="stock-card"
                    key={stock.id}
                  >

                    <div className="stock-info">

                      <div className="stock-icon">
                        {stock.symbol}
                      </div>

                      <div>
                        <h3>
                          {stock.name}
                        </h3>

                        <p>
                          {stock.shares}{' '}
                          shares
                        </p>
                      </div>

                    </div>

                    <div className="stock-price">

                      <strong>
                        {formatMoney(
                          stock.price *
                            stock.shares
                        )}
                      </strong>

                      <span>
                        {formatMoney(
                          stock.price
                        )}{' '}
                        / share
                      </span>

                    </div>

                  </div>
                ))}

              </div>

            </section>

          </section>
        )}

        {/* =========================
            LEADERBOARD TAB
        ========================= */}

        {activeTab === 'leaderboard' && (

          <section className="leaderboard">

            <div className="welcome">

              <h2>
                LEADERBOARD
              </h2>

              <p>
                Players ranked by final portfolio value.
              </p>

            </div>

            {leaderboardLoading ? (

              <div className="card leaderboard-loading">
                LOADING...
              </div>

            ) : leaderboard.length === 0 ? (

              <div className="card">
                No players yet.
              </div>

            ) : (

              <div className="leaderboard-list">

                {leaderboard.map(
                  (player, index) => (

                    <div
                      className={
                        player.id ===
                        currentPlayer.id
                          ? 'leaderboard-row your-score'
                          : 'leaderboard-row'
                      }
                      key={player.id}
                    >

                      <div className="rank">
                        #{index + 1}
                      </div>

                      <div className="player-name">

                        <strong>
                          {player.username}
                        </strong>

                        {player.id ===
                          currentPlayer.id && (
                          <span>
                            YOU
                          </span>
                        )}

                      </div>

                      <strong className="player-value">
                        {formatMoney(
                          player.score ||
                            0
                        )}
                      </strong>

                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}

      </main>

    </div>
  )
}

export default App