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
    id: 'fuelpower',
    name: 'FuelPower',
    symbol: 'FUEL',
    icon: '🔥',
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
    title: 'BREAKING NEWS',
    news: 'SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT',
    description: 'The government awards SunVolt a major solar contract.',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
    reasons: {
      sunvolt: 'Contract success boosts SunVolt’s expected business.',
      fuelpower: 'Greater solar dependence reduces demand for fuel.',
      foodrush: 'Lower fuel costs reduce cooking and operating costs.',
      movemax: 'Lower fuel costs encourage more transportation.',
      medicore: 'The solar contract has no direct effect on MediCore.',
    },
  },

  {
    id: 2,
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY',
    description: 'A sudden rise in oil prices affects different sectors.',
    decisionTime: 30,
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
    reasons: {
      sunvolt: 'Expensive oil increases interest in alternative energy.',
      fuelpower: 'Higher oil prices increase the value of fuel companies.',
      foodrush: 'Higher fuel costs increase operating and cooking expenses.',
      movemax: 'Transport becomes more expensive as fuel prices rise.',
      medicore: 'Oil prices have little direct effect on MediCore.',
    },
  },

  {
    id: 3,
    title: 'MARKET ALERT',
    news: 'A MAJOR GLOBAL ECONOMIC SHOCK HITS MARKETS',
    description: 'Markets become uncertain and investors react.',
    decisionTime: 30,
    prices: {
      sunvolt: 95,
      fuelpower: 72,
      foodrush: 82,
      movemax: 60,
      medicore: 88,
    },
    reasons: {
      sunvolt: 'Economic uncertainty reduces investment in solar projects.',
      fuelpower: 'The global shock weakens demand and investor confidence.',
      foodrush: 'Consumers reduce spending during economic uncertainty.',
      movemax: 'Transport demand falls during an economic slowdown.',
      medicore: 'Healthcare demand is more defensive but still faces uncertainty.',
    },
  },

  {
    id: 4,
    title: 'FINAL CHALLENGE',
    news: 'ECONOMIC CONDITIONS BEGIN SHOWING SIGNS OF RECOVERY',
    description: 'Some sectors recover faster than others.',
    decisionTime: 30,
    prices: {
      sunvolt: 115,
      fuelpower: 105,
      foodrush: 125,
      movemax: 90,
      medicore: 140,
    },
    reasons: {
      sunvolt: 'Recovery restores investment and demand for clean energy.',
      fuelpower: 'Fuel demand improves as economic activity returns.',
      foodrush: 'Consumers spend more as normal economic activity resumes.',
      movemax: 'Transport recovers, but not as strongly as other sectors.',
      medicore: 'Healthcare remains a strong defensive sector.',
    },
  },

  {
    id: 5,
    title: 'PETROL PRICE CUT',
    news: 'GOVT ANNOUNCES PETROL PRICES CUT BY 50%',
    description: 'Cheaper petrol changes consumer and business behaviour.',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 25,
      foodrush: 170,
      movemax: 130,
      medicore: 200,
    },
    reasons: {
      sunvolt: 'Cheaper petrol makes some people less dependent on solar power.',
      fuelpower: 'A 50% petrol price cut reduces fuel-company value.',
      foodrush: 'Lower fuel costs improve food-company margins.',
      movemax: 'Cheap petrol encourages more people to use vehicles.',
      medicore: 'Petrol prices have no direct effect on MediCore.',
    },
  },

  {
    id: 6,
    title: 'HEALTH CRISIS',
    news: 'NEW VIRUS OUTBREAK — GOVERNMENT ANNOUNCES FULL LOCKDOWN',
    description: 'People stay home while essential services continue.',
    decisionTime: 30,
    prices: {
      sunvolt: 190,
      fuelpower: 50,
      foodrush: 140,
      movemax: 70,
      medicore: 200,
    },
    reasons: {
      sunvolt: 'Factory and office closures reduce demand for solar energy.',
      fuelpower: 'Lockdown sharply reduces vehicle and fuel usage.',
      foodrush: 'People staying home increases food and essential deliveries.',
      movemax: 'Transport demand falls heavily during lockdown.',
      medicore: 'Virus-related healthcare demand increases sharply.',
    },
  },
]

function formatMoney(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function App() {
  const [currentPlayer, setCurrentPlayer] = useState(null)

  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [gameStarted, setGameStarted] = useState(false)
  const [round, setRound] = useState(0)
  const [activeTab, setActiveTab] = useState('market')

  const [stocks, setStocks] = useState(
    INITIAL_STOCKS.map((stock) => ({ ...stock }))
  )

  const [cash, setCash] = useState(STARTING_CAPITAL)

  const [timer, setTimer] = useState(0)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [decisionLocked, setDecisionLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)

  const [decisions, setDecisions] = useState({})
  const [portfolioHistory, setPortfolioHistory] = useState([
    STARTING_CAPITAL,
  ])

  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const [swipeState, setSwipeState] = useState({})

  useEffect(() => {
    const savedPlayer = localStorage.getItem('stockMarketPlayer')

    if (!savedPlayer) return

    try {
      const parsed = JSON.parse(savedPlayer)

      if (parsed?.id && parsed?.username) {
        setCurrentPlayer(parsed)
      }
    } catch {
      localStorage.removeItem('stockMarketPlayer')
    }
  }, [])

  const currentRound =
    round > 0 ? ROUND_DATA[round - 1] : null

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

  const showSupabaseError = (error, fallback) => {
    console.error(error)

    if (!error) {
      setAuthMessage(fallback)
      return
    }

    if (error.code === '23505') {
      setAuthMessage('Username already exists.')
      return
    }

    if (error.code === '42501') {
      setAuthMessage(
        'Database permission blocked this action. Check Supabase policies.'
      )
      return
    }

    setAuthMessage(
      error.message
        ? `Database error: ${error.message}`
        : fallback
    )
  }

  const createAccount = async () => {
    const cleanUsername = username.trim()
    const cleanPin = pin.trim()

    setAuthMessage('')

    if (!cleanUsername || !cleanPin) {
      setAuthMessage('Enter a username and PIN.')
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
      const { data: existing, error: checkError } =
        await supabase
          .from('players')
          .select('id, username')
          .eq('username', cleanUsername)
          .maybeSingle()

      if (checkError) {
        showSupabaseError(
          checkError,
          'Could not check username.'
        )
        return
      }

      if (existing) {
        setAuthMessage(
          'Username already exists. Try logging in.'
        )
        return
      }

      const { data: newPlayer, error } =
        await supabase
          .from('players')
          .insert({
            username: cleanUsername,
            pin: cleanPin,
            score: STARTING_CAPITAL,
          })
          .select()
          .single()

      if (error) {
        showSupabaseError(
          error,
          'Could not create account.'
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
    } catch (error) {
      showSupabaseError(
        error,
        'Could not create account.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const login = async () => {
    const cleanUsername = username.trim()
    const cleanPin = pin.trim()

    setAuthMessage('')

    if (!cleanUsername || !cleanPin) {
      setAuthMessage('Enter a username and PIN.')
      return
    }

    setAuthLoading(true)

    try {
      const { data: player, error } =
        await supabase
          .from('players')
          .select('*')
          .eq('username', cleanUsername)
          .eq('pin', cleanPin)
          .maybeSingle()

      if (error) {
        showSupabaseError(
          error,
          'Login failed.'
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
    } catch (error) {
      showSupabaseError(
        error,
        'Login failed.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const resetGame = () => {
    setGameStarted(false)
    setRound(0)
    setActiveTab('market')

    setStocks(
      INITIAL_STOCKS.map((stock) => ({
        ...stock,
      }))
    )

    setCash(STARTING_CAPITAL)
    setTimer(0)
    setDecisionOpen(false)
    setDecisionLocked(false)
    setRevealed(false)
    setGameFinished(false)

    setDecisions({})
    setSwipeState({})

    setPortfolioHistory([
      STARTING_CAPITAL,
    ])
  }

  const logout = () => {
    localStorage.removeItem('stockMarketPlayer')
    setCurrentPlayer(null)
    resetGame()
  }

  const startGame = () => {
    resetGame()
    setGameStarted(true)
  }

  const startDecision = () => {
    if (!currentRound) return

    setDecisions({})
    setSwipeState({})
    setDecisionLocked(false)
    setRevealed(false)
    setTimer(currentRound.decisionTime)
    setDecisionOpen(true)
  }

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

  const updateDecision = (
    stockId,
    action,
    quantity
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

  const buyShares = (
    stockId,
    quantity = 1
  ) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed
    ) {
      return
    }

    const stock = stocks.find(
      (item) => item.id === stockId
    )

    if (!stock) return

    const maxBuy = Math.floor(
      cash / stock.price
    )

    if (quantity > maxBuy || quantity <= 0) {
      return
    }

    const totalCost =
      stock.price * quantity

    setCash(
      (previous) =>
        previous - totalCost
    )

    setStocks((previousStocks) =>
      previousStocks.map((item) => {
        if (item.id !== stockId) {
          return item
        }

        const newShares =
          item.shares + quantity

        const oldInvestment =
          item.shares * item.avgPrice

        const newInvestment =
          oldInvestment + totalCost

        return {
          ...item,
          shares: newShares,
          avgPrice:
            newShares > 0
              ? newInvestment / newShares
              : 0,
        }
      })
    )

    const previousQuantity =
      decisions[stockId]?.action === 'BUY'
        ? decisions[stockId].quantity
        : 0

    updateDecision(
      stockId,
      'BUY',
      previousQuantity + quantity
    )
  }

  const sellShares = (
    stockId,
    quantity = 1
  ) => {
    if (
      !decisionOpen ||
      decisionLocked ||
      revealed
    ) {
      return
    }

    const stock = stocks.find(
      (item) => item.id === stockId
    )

    if (!stock) return

    if (
      stock.shares < quantity ||
      quantity <= 0
    ) {
      return
    }

    const totalReceived =
      stock.price * quantity

    setCash(
      (previous) =>
        previous + totalReceived
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

    const previousQuantity =
      decisions[stockId]?.action === 'SELL'
        ? decisions[stockId].quantity
        : 0

    updateDecision(
      stockId,
      'SELL',
      previousQuantity + quantity
    )
  }

  const holdStock = (stockId) => {
    updateDecision(
      stockId,
      'HOLD',
      0
    )
  }

  const handlePointerDown = (
    event,
    stockId
  ) => {
    if (!decisionOpen || decisionLocked) {
      return
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    )

    setSwipeState((previous) => ({
      ...previous,
      [stockId]: {
        startX: event.clientX,
        currentX: event.clientX,
      },
    }))
  }

  const handlePointerMove = (
    event,
    stockId
  ) => {
    const state = swipeState[stockId]

    if (!state) return

    setSwipeState((previous) => ({
      ...previous,
      [stockId]: {
        ...state,
        currentX: event.clientX,
      },
    }))
  }

  const handlePointerUp = (
    event,
    stockId
  ) => {
    const state = swipeState[stockId]

    if (!state) return

    const distance =
      event.clientX - state.startX

    setSwipeState((previous) => {
      const copy = { ...previous }
      delete copy[stockId]
      return copy
    })

    if (distance > 80) {
      buyShares(stockId, 1)
    }

    if (distance < -80) {
      sellShares(stockId, 1)
    }
  }

  const lockDecision = () => {
    setDecisionLocked(true)
    setDecisionOpen(false)
    setTimer(0)
  }

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

  const nextRound = () => {
    const newPortfolioHistory = [
      ...portfolioHistory,
      portfolioValue,
    ]

    setPortfolioHistory(
      newPortfolioHistory
    )

    if (round >= ROUND_DATA.length) {
      finishGame()
      return
    }

    setRound(
      (previous) => previous + 1
    )

    setDecisionLocked(false)
    setDecisionOpen(false)
    setRevealed(false)
    setDecisions({})
    setSwipeState({})
    setTimer(0)
    setActiveTab('market')
  }

  const finishGame = async () => {
    setGameFinished(true)
    setActiveTab('portfolio')

    const finalValue =
      portfolioValue

    if (!currentPlayer?.id) return

    try {
      const { error } =
        await supabase
          .from('players')
          .update({
            score: Math.round(
              finalValue
            ),
          })
          .eq(
            'id',
            currentPlayer.id
          )

      if (error) {
        console.error(
          'Score update failed:',
          error
        )
      }

      loadLeaderboard()
    } catch (error) {
      console.error(error)
    }
  }

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true)

    try {
      const { data, error } =
        await supabase
          .from('players')
          .select('id, username, score')
          .order('score', {
            ascending: false,
          })
          .limit(50)

      if (error) {
        console.error(
          'Leaderboard error:',
          error
        )
        return
      }

      setLeaderboard(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard()
    }
  }, [activeTab])

  const getInitialPrice = (stockId) => {
    if (round <= 1) {
      return 100
    }

    return (
      ROUND_DATA[round - 2]?.prices[
        stockId
      ] ?? 100
    )
  }

  const chartPoints = useMemo(() => {
    const values = [
      ...portfolioHistory,
      gameFinished
        ? portfolioValue
        : portfolioHistory[
            portfolioHistory.length - 1
          ],
    ]

    const width = 800
    const height = 280
    const padding = 30

    const min = Math.min(...values)
    const max = Math.max(...values)

    const range =
      max - min === 0
        ? 1
        : max - min

    return values.map(
      (value, index) => {
        const x =
          padding +
          (index *
            (width -
              padding * 2)) /
            Math.max(
              values.length - 1,
              1
            )

        const y =
          height -
          padding -
          ((value - min) /
            range) *
            (height -
              padding * 2)

        return {
          x,
          y,
          value,
          label:
            index === 0
              ? 'START'
              : `R${index}`,
        }
      }
    )
  }, [
    portfolioHistory,
    portfolioValue,
    gameFinished,
  ])

  const chartPolyline =
    chartPoints
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(' ')

  if (!currentPlayer) {
    return (
      <div className="app auth-page">
        <div className="auth-card">
          <div className="big-logo">
            📈
          </div>

          <h1>StockMarket</h1>

          <p className="subtitle">
            Learn. Trade. Think.
          </p>

          <div className="auth-tabs">
            <button
              className={
                authMode === 'login'
                  ? 'active'
                  : ''
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
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setAuthMode('create')
                setAuthMessage('')
              }}
            >
              Create Account
            </button>
          </div>

          <label>Username</label>

          <input
            value={username}
            placeholder="Username"
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
          />

          <label>PIN</label>

          <input
            type="password"
            value={pin}
            placeholder="PIN"
            onChange={(e) =>
              setPin(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                authMode === 'login'
                  ? login()
                  : createAccount()
              }
            }}
          />

          {authMessage && (
            <div className="auth-error">
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
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="app start-page">
        <div className="start-card">
          <div className="big-logo">
            📈
          </div>

          <div className="eyebrow">
            STOCK MARKET LIVE
          </div>

          <h1>
            Ready,{' '}
            {currentPlayer.username}?
          </h1>

          <p>
            Build your portfolio across
            6 market-changing rounds.
          </p>

          <div className="start-stats">
            <div>
              <span>CAPITAL</span>
              <strong>
                {formatMoney(
                  STARTING_CAPITAL
                )}
              </strong>
            </div>

            <div>
              <span>ROUNDS</span>
              <strong>6</strong>
            </div>

            <div>
              <span>TIME</span>
              <strong>30s</strong>
            </div>
          </div>

          <button
            className="primary-button large"
            onClick={startGame}
          >
            START GAME →
          </button>

          <button
            className="text-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">
            STOCK MARKET LIVE
          </div>

          <h1>
            {gameFinished
              ? 'MARKET CLOSED'
              : `ROUND ${round} / 6`}
          </h1>
        </div>

        <div className="top-money">
          <span>PORTFOLIO</span>
          <strong>
            {formatMoney(
              portfolioValue
            )}
          </strong>
        </div>
      </header>

      <nav className="main-tabs">
        <button
          className={
            activeTab === 'market'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('market')
          }
        >
          📈
          <span>Market</span>
        </button>

        <button
          className={
            activeTab === 'portfolio'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('portfolio')
          }
        >
          💼
          <span>Portfolio</span>
        </button>

        <button
          className={
            activeTab === 'leaderboard'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'leaderboard'
            )
          }
        >
          🏆
          <span>Leaderboard</span>
        </button>
      </nav>

      <main className="content">
        {activeTab === 'market' && (
          <>
            {!gameFinished &&
              round === 0 && (
                <section className="market-intro">
                  <div className="round-pill">
                    ROUND 1
                  </div>

                  <h2>
                    Market is open.
                  </h2>

                  <p>
                    Watch the news.
                    Then decide what
                    to do with your
                    money.
                  </p>

                  <div className="company-mini-grid">
                    {stocks.map(
                      (stock) => (
                        <div
                          key={
                            stock.id
                          }
                          className="mini-company"
                        >
                          <span>
                            {
                              stock.icon
                            }
                          </span>

                          <strong>
                            {
                              stock.name
                            }
                          </strong>

                          <small>
                            {formatMoney(
                              stock.price
                            )}
                          </small>
                        </div>
                      )
                    )}
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
              )}

            {!gameFinished &&
              round > 0 &&
              currentRound && (
                <>
                  <section className="news-card">
                    <div className="news-top">
                      <span>
                        ROUND {round}
                      </span>

                      {decisionOpen && (
                        <strong>
                          {timer}s
                        </strong>
                      )}
                    </div>

                    <h2>
                      {currentRound.news}
                    </h2>

                    {!decisionOpen &&
                      !decisionLocked &&
                      !revealed && (
                        <p>
                          {currentRound.description}
                        </p>
                      )}
                  </section>

                  {!decisionOpen &&
                    !decisionLocked &&
                    !revealed && (
                      <section className="ready-card">
                        <div className="ready-icon">
                          ⚡
                        </div>

                        <h2>
                          Your move.
                        </h2>

                        <p>
                          Swipe right to
                          buy. Swipe left
                          to sell.
                        </p>

                        <button
                          className="primary-button"
                          onClick={
                            startDecision
                          }
                        >
                          START 30s →
                        </button>
                      </section>
                    )}

                  {decisionOpen && (
                    <section className="trading-area">
                      <div className="swipe-guide">
                        <span className="sell-guide">
                          ← SELL
                        </span>

                        <span>
                          SWIPE
                        </span>

                        <span className="buy-guide">
                          BUY →
                        </span>
                      </div>

                      <div className="stock-stack">
                        {stocks.map(
                          (stock) => {
                            const decision =
                              decisions[
                                stock.id
                              ]

                            const state =
                              swipeState[
                                stock.id
                              ]

                            const offset =
                              state
                                ? state.currentX -
                                  state.startX
                                : 0

                            const owned =
                              stock.shares

                            return (
                              <div
                                key={
                                  stock.id
                                }
                                className={`trade-card ${
                                  decision
                                    ? `decision-${decision.action.toLowerCase()}`
                                    : ''
                                }`}
                                style={{
                                  transform: `translateX(${offset}px) rotate(${offset / 25}deg)`,
                                }}
                                onPointerDown={(
                                  e
                                ) =>
                                  handlePointerDown(
                                    e,
                                    stock.id
                                  )
                                }
                                onPointerMove={(
                                  e
                                ) =>
                                  handlePointerMove(
                                    e,
                                    stock.id
                                  )
                                }
                                onPointerUp={(
                                  e
                                ) =>
                                  handlePointerUp(
                                    e,
                                    stock.id
                                  )
                                }
                                onPointerCancel={(
                                  e
                                ) =>
                                  handlePointerUp(
                                    e,
                                    stock.id
                                  )
                                }
                              >
                                {offset >
                                  40 && (
                                  <div className="swipe-label buy-label">
                                    BUY
                                  </div>
                                )}

                                {offset <
                                  -40 && (
                                  <div className="swipe-label sell-label">
                                    SELL
                                  </div>
                                )}

                                <div className="trade-main">
                                  <div className="stock-icon">
                                    {
                                      stock.icon
                                    }
                                  </div>

                                  <div>
                                    <h3>
                                      {
                                        stock.name
                                      }
                                    </h3>

                                    <span>
                                      {
                                        stock.symbol
                                      }
                                    </span>
                                  </div>

                                  <strong className="trade-price">
                                    {formatMoney(
                                      stock.price
                                    )}
                                  </strong>
                                </div>

                                <div className="trade-bottom">
                                  <span>
                                    Owned:{' '}
                                    <b>
                                      {
                                        owned
                                      }
                                    </b>
                                  </span>

                                  {decision && (
                                    <span className="decision-status">
                                      {decision.action ===
                                      'BUY'
                                        ? `BUY × ${decision.quantity}`
                                        : decision.action ===
                                          'SELL'
                                        ? `SELL × ${decision.quantity}`
                                        : 'HOLD'}
                                    </span>
                                  )}
                                </div>

                                <button
                                  className="hold-button"
                                  onPointerDown={(
                                    e
                                  ) =>
                                    e.stopPropagation()
                                  }
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation()
                                    holdStock(
                                      stock.id
                                    )
                                  }}
                                >
                                  HOLD
                                </button>
                              </div>
                            )
                          }
                        )}
                      </div>

                      <button
                        className="lock-button"
                        onClick={
                          lockDecision
                        }
                      >
                        🔒 LOCK DECISIONS
                      </button>
                    </section>
                  )}

                  {decisionLocked &&
                    !revealed && (
                      <section className="locked-card">
                        <div>
                          🔒
                        </div>

                        <h2>
                          Decisions locked.
                        </h2>

                        <p>
                          Let's see what
                          happened to the
                          market.
                        </p>

                        <button
                          className="primary-button"
                          onClick={
                            revealPrices
                          }
                        >
                          REVEAL MARKET →
                        </button>
                      </section>
                    )}

                  {revealed && (
                    <section className="results-card">
                      <div className="result-heading">
                        <span>
                          MARKET MOVES
                        </span>

                        <h2>
                          Here's what happened.
                        </h2>
                      </div>

                      <div className="result-list">
                        {stocks.map(
                          (stock) => {
                            const before =
                              getInitialPrice(
                                stock.id
                              )

                            const change =
                              stock.price -
                              before

                            return (
                              <div
                                key={
                                  stock.id
                                }
                                className="result-item"
                              >
                                <div className="result-top">
                                  <div>
                                    <span className="result-icon">
                                      {
                                        stock.icon
                                      }
                                    </span>

                                    <strong>
                                      {
                                        stock.name
                                      }
                                    </strong>
                                  </div>

                                  <strong
                                    className={
                                      change >=
                                      0
                                        ? 'price-up'
                                        : 'price-down'
                                    }
                                  >
                                    {change >=
                                    0
                                      ? '▲'
                                      : '▼'}{' '}
                                    {formatMoney(
                                      Math.abs(
                                        change
                                      )
                                    )}
                                  </strong>
                                </div>

                                <p>
                                  {
                                    currentRound
                                      .reasons[
                                      stock.id
                                    ]
                                  }
                                </p>
                              </div>
                            )
                          }
                        )}
                      </div>

                      <div className="round-total">
                        <span>
                          PORTFOLIO
                        </span>

                        <strong>
                          {formatMoney(
                            portfolioValue
                          )}
                        </strong>
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
                          ? 'VIEW FINAL PORTFOLIO →'
                          : 'NEXT ROUND →'}
                      </button>
                    </section>
                  )}
                </>
              )}

            {gameFinished && (
              <section className="final-market-card">
                <div className="final-icon">
                  🏆
                </div>

                <span>
                  FINAL PORTFOLIO
                </span>

                <strong>
                  {formatMoney(
                    portfolioValue
                  )}
                </strong>

                <div
                  className={
                    profitLoss >= 0
                      ? 'profit-big'
                      : 'loss-big'
                  }
                >
                  {profitLoss >= 0
                    ? '▲'
                    : '▼'}{' '}
                  {formatMoney(
                    Math.abs(
                      profitLoss
                    )
                  )}
                </div>

                <button
                  className="primary-button"
                  onClick={() =>
                    setActiveTab(
                      'portfolio'
                    )
                  }
                >
                  VIEW PORTFOLIO →
                </button>
              </section>
            )}
          </>
        )}

        {activeTab === 'portfolio' && (
          <section className="portfolio-page">
            <div className="portfolio-total">
              <span>
                TOTAL PORTFOLIO
              </span>

              <strong>
                {formatMoney(
                  portfolioValue
                )}
              </strong>

              <small
                className={
                  profitLoss >= 0
                    ? 'price-up'
                    : 'price-down'
                }
              >
                {profitLoss >= 0
                  ? '▲'
                  : '▼'}{' '}
                {formatMoney(
                  Math.abs(
                    profitLoss
                  )
                )}
              </small>
            </div>

            <div className="chart-card">
              <div className="section-title">
                <div>
                  <span>
                    PERFORMANCE
                  </span>

                  <h2>
                    Portfolio Value
                  </h2>
                </div>

                <small>
                  Round by round
                </small>
              </div>

              <div className="chart">
                <svg
                  viewBox="0 0 800 280"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={
                      chartPolyline
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chartPoints.map(
                    (point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="7"
                        fill="currentColor"
                      />
                    )
                  )}
                </svg>
              </div>

              <div className="chart-labels">
                {chartPoints.map(
                  (point, index) => (
                    <span key={index}>
                      {point.label}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="holdings-card">
              <div className="section-title">
                <div>
                  <span>
                    CURRENT HOLDINGS
                  </span>

                  <h2>
                    Your Stocks
                  </h2>
                </div>
              </div>

              <div className="holdings-list">
                {stocks.map(
                  (stock) => (
                    <div
                      className="holding-row"
                      key={stock.id}
                    >
                      <div className="holding-name">
                        <span>
                          {
                            stock.icon
                          }
                        </span>

                        <div>
                          <strong>
                            {
                              stock.name
                            }
                          </strong>

                          <small>
                            {
                              stock.shares
                            }{' '}
                            shares
                          </small>
                        </div>
                      </div>

                      <strong>
                        {formatMoney(
                          stock.price *
                            stock.shares
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab ===
          'leaderboard' && (
          <section className="leaderboard-page">
            <div className="leaderboard-heading">
              <span>
                COMPETE
              </span>

              <h2>
                Leaderboard
              </h2>

              <p>
                Highest portfolio wins.
              </p>
            </div>

            {leaderboardLoading ? (
              <div className="loading-card">
                Loading leaderboard...
              </div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map(
                  (player, index) => (
                    <div
                      key={
                        player.id
                      }
                      className={`leader-row ${
                        player.id ===
                        currentPlayer.id
                          ? 'you'
                          : ''
                      }`}
                    >
                      <div className="rank">
                        {index ===
                        0
                          ? '🥇'
                          : index ===
                            1
                          ? '🥈'
                          : index ===
                            2
                          ? '🥉'
                          : `#${index + 1}`}
                      </div>

                      <div className="leader-name">
                        <strong>
                          {
                            player.username
                          }
                        </strong>

                        {player.id ===
                          currentPlayer.id && (
                          <small>
                            YOU
                          </small>
                        )}
                      </div>

                      <strong>
                        {formatMoney(
                          player.score ||
                            0
                        )}
                      </strong>
                    </div>
                  )
                )}

                {leaderboard.length ===
                  0 && (
                  <div className="loading-card">
                    No players yet.
                  </div>
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