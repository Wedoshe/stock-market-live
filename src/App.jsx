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
    type: 'breaking',
    title: 'BREAKING NEWS',
    news: 'SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT.',
    description:
      'A major government solar contract is announced, changing expectations across the market.',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
    explanations: {
      sunvolt:
        'Profit — the successful government solar contract increases future demand and business.',
      fuelpower:
        'Loss — greater dependence on solar reduces demand for fuel.',
      foodrush:
        'Profit — lower fuel costs reduce operating costs for the food company.',
      movemax:
        'Profit — lower fuel costs make transportation cheaper, encouraging more vehicle use.',
      medicore:
        'No change — the solar contract does not directly affect healthcare.',
    },
  },

  {
    id: 2,
    type: 'indirect',
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY.',
    description:
      'Higher oil prices increase fuel and transportation costs across the economy.',
    decisionTime: 30,
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
    explanations: {
      sunvolt:
        'Profit — expensive fuel encourages greater dependence on alternative energy such as solar.',
      fuelpower:
        'Profit — higher oil prices increase the value and revenue potential of fuel companies.',
      foodrush:
        'Loss — higher fuel costs increase transportation and operating expenses.',
      movemax:
        'Loss — higher fuel prices increase transportation costs and reduce vehicle usage.',
      medicore:
        'No change — rising oil prices have no major direct effect on healthcare.',
    },
  },

  {
    id: 3,
    type: 'policy',
    title: 'GOVERNMENT POLICY',
    news: 'GOVERNMENT BANS ENTRY OF DIESEL VEHICLES. EV VEHICLES WILL BE PAID TO OPERATE.',
    description:
      'The government shifts transportation away from diesel vehicles and supports electric vehicles.',
    decisionTime: 30,
    prices: {
      sunvolt: 210,
      fuelpower: 80,
      foodrush: 100,
      movemax: 130,
      medicore: 100,
    },
    explanations: {
      sunvolt:
        'Profit — increased EV usage raises demand for electricity and renewable solar power.',
      fuelpower:
        'Loss — diesel restrictions reduce demand for traditional fuel.',
      foodrush:
        'No change — food production is not directly affected by the diesel vehicle ban.',
      movemax:
        'Profit — government support for EV operation increases demand while diesel competitors are restricted.',
      medicore:
        'No change — the vehicle policy has no direct effect on healthcare.',
    },
  },

  {
    id: 4,
    type: 'crisis',
    title: 'MARKET ALERT',
    news: 'NEW VIRUS OUTBREAK — GOVERNMENT ANNOUNCES FULL LOCKDOWN.',
    description:
      'People stay home during a nationwide lockdown, dramatically changing demand across industries.',
    decisionTime: 30,
    prices: {
      sunvolt: 190,
      fuelpower: 50,
      foodrush: 140,
      movemax: 70,
      medicore: 200,
    },
    explanations: {
      sunvolt:
        'Loss — factories and offices close, reducing overall energy demand.',
      fuelpower:
        'Loss — people staying home means far less fuel is needed for transportation.',
      foodrush:
        'Profit — people staying home increases online food and essential-item orders.',
      movemax:
        'Loss — lockdown restrictions greatly reduce vehicle and transport usage.',
      medicore:
        'Profit — the virus increases healthcare demand and creates opportunities for treatment and vaccines.',
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

  // Portfolio value after each round
  const [portfolioHistory, setPortfolioHistory] = useState([
    STARTING_CAPITAL,
  ])

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
  // ACCOUNT ERROR
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
      STARTING_CAPITAL,
    ])
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

  const portfolioValue =
    cash + stockValue

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
  }, [
    decisionOpen,
    decisionLocked,
    timer,
  ])

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
  // BUY
  // =========================

  const buyShares = (
    stockId,
    quantity
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
          avgPrice:
            newAveragePrice,
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

  const sellShares = (
    stockId,
    quantity
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
  // LOCK
  // =========================

  const lockDecision = () => {
    setDecisionLocked(true)
    setDecisionOpen(false)
    setTimer(0)
  }

  // =========================
  // REVEAL
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
          currentRound.prices[
            stock.id
          ] ?? stock.price,
      }))
    )

    setRevealed(true)
  }

  // =========================
  // SAVE ROUND HISTORY
  // =========================

  useEffect(() => {
    if (!revealed) return

    setPortfolioHistory((previous) => {
      const updated = [
        ...previous,
        portfolioValue,
      ]

      if (
        updated.length >
        ROUND_DATA.length + 1
      ) {
        return updated.slice(
          0,
          ROUND_DATA.length + 1
        )
      }

      return updated
    })
  }, [revealed])

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
      } else {
        const updatedPlayer = {
          ...currentPlayer,
          score: Math.round(
            portfolioValue
          ),
        }

        setCurrentPlayer(
          updatedPlayer
        )

        localStorage.setItem(
          'stockMarketPlayer',
          JSON.stringify(
            updatedPlayer
          )
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
            📈
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
              📰
              <strong>
                Market News
              </strong>
              <span>
                React to information
              </span>
            </div>

            <div>
              ⏱️
              <strong>
                Timed Decisions
              </strong>
              <span>
                30 seconds
              </span>
            </div>

            <div>
              📊
              <strong>
                Hidden Prices
              </strong>
              <span>
                Think before trading
              </span>
            </div>

            <div>
              🏆
              <strong>
                Final Ranking
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

          <h1>
            MARKET CLOSED
          </h1>

          <p>
            Final portfolio
          </p>

          <div className="final-card">

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

          </div>

          <div className="final-graph-card">

            <h2>
              PORTFOLIO PERFORMANCE
            </h2>

            <PortfolioGraph
              values={portfolioHistory}
            />

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

            <h1>
              MARKET OPEN
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

        <main className="game-main">

          <section className="market-open-card">

            <div className="round-number">
              ROUND 1
            </div>

            <h2>
              MARKET OPEN
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

      <main className="game-main">

        {/* NEWS */}

        <section
          className={`news-card ${currentRound.type}`}
        >

          <div className="news-badge">

            {currentRound.type ===
            'crisis'
              ? 'MARKET ALERT'
              : currentRound.type ===
                'policy'
              ? 'GOVERNMENT POLICY'
              : currentRound.type ===
                'indirect'
              ? 'MARKET INFORMATION'
              : 'BREAKING NEWS'}

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
                onClick={
                  startDecision
                }
              >
                START{' '}
                {
                  currentRound.decisionTime
                }s TIMER
              </button>

            </section>
          )}

        {/* DECISION MODE */}

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
                  {formatMoney(cash)}
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
                  decisions[
                    stock.id
                  ]

                const selectedAction =
                  selected?.action

                const selectedQuantity =
                  selected?.quantity || 0

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
                  >

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

                    <div className="quantity-area">

                      <span>
                        BUY / SELL QUANTITY
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
                          −
                        </button>

                        <strong>
                          {selectedQuantity}
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
                          maxBuy <= 0
                        }
                        onClick={() => {

                          const quantity =
                            selectedAction ===
                              'BUY' &&
                            selectedQuantity >
                              0
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
                        selectedQuantity >
                          0
                          ? `BUY × ${selectedQuantity}`
                          : 'BUY'}
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
                        {selectedAction ===
                        'HOLD'
                          ? 'HOLDING'
                          : 'HOLD'}
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
                        onClick={() => {

                          const quantity =
                            selectedAction ===
                              'SELL' &&
                            selectedQuantity >
                              0
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
                        selectedQuantity >
                          0
                          ? `SELL × ${selectedQuantity}`
                          : 'SELL'}
                      </button>

                    </div>

                    {selectedAction && (
                      <div className="selected-decision">

                        {selectedAction ===
                          'BUY' &&
                        selectedQuantity >
                          0 ? (
                          <>
                            Buying{' '}
                            <strong>
                              {
                                selectedQuantity
                              }
                            </strong>{' '}
                            shares
                          </>
                        ) : selectedAction ===
                            'SELL' &&
                          selectedQuantity >
                            0 ? (
                          <>
                            Selling{' '}
                            <strong>
                              {
                                selectedQuantity
                              }
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
              onClick={
                lockDecision
              }
            >
              LOCK DECISIONS
            </button>

          </section>
        )}

        {/* LOCKED */}

        {decisionLocked &&
          !revealed && (
            <section className="locked-card">

              <div>
                LOCKED
              </div>

              <h2>
                DECISION LOCKED
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
                REVEAL MARKET →
              </button>

            </section>
          )}

        {/* REVEAL */}

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
                        currentRound.id - 2
                      ].prices[
                        stock.id
                      ] ?? stock.price

                const change =
                  stock.price -
                  before

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
                        change > 0
                          ? 'price-up'
                          : change < 0
                          ? 'price-down'
                          : 'price-neutral'
                      }
                    >
                      {change > 0
                        ? '▲ '
                        : change < 0
                        ? '▼ '
                        : '= '}

                      {formatMoney(
                        stock.price
                      )}
                    </span>

                  </div>
                )
              })}

            </div>

            {/* ROUND EXPLANATIONS */}

            <div className="round-explanations">

              <h2>
                ROUND OUTCOME
              </h2>

              <div className="explanation-list">

                {stocks.map((stock) => {

                  const explanation =
                    currentRound
                      .explanations?.[
                      stock.id
                    ]

                  if (!explanation) {
                    return null
                  }

                  return (
                    <div
                      className="explanation-row"
                      key={stock.id}
                    >

                      <strong>
                        {stock.name}
                      </strong>

                      <span>
                        {explanation}
                      </span>

                    </div>
                  )
                })}

              </div>

            </div>

            {/* PORTFOLIO */}

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

// =========================
// PORTFOLIO GRAPH
// =========================

function PortfolioGraph({
  values,
}) {
  if (!values || values.length === 0) {
    return null
  }

  const width = 700
  const height = 280
  const padding = 45

  const minValue =
    Math.min(...values)

  const maxValue =
    Math.max(...values)

  const range =
    maxValue - minValue || 1

  const points = values.map(
    (value, index) => {
      const x =
        padding +
        (index /
          Math.max(
            values.length - 1,
            1
          )) *
          (width -
            padding * 2)

      const y =
        height -
        padding -
        ((value - minValue) /
          range) *
          (height -
            padding * 2)

      return `${x},${y}`
    }
  )

  return (
    <div className="portfolio-chart">

      <div className="chart-container">

        <svg
          className="portfolio-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >

          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {values.map(
            (value, index) => {

              const x =
                padding +
                (index /
                  Math.max(
                    values.length - 1,
                    1
                  )) *
                  (width -
                    padding * 2)

              const y =
                height -
                padding -
                ((value - minValue) /
                  range) *
                  (height -
                    padding * 2)

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="7"
                  fill="currentColor"
                />
              )
            }
          )}

        </svg>

      </div>

      <div className="chart-values">

        {values.map(
          (value, index) => (
            <span key={index}>
              {index === 0
                ? 'START'
                : `ROUND ${index}`}
              :{' '}
              <strong>
                {formatMoney(
                  value
                )}
              </strong>
            </span>
          )
        )}

      </div>

    </div>
  )
}

export default App