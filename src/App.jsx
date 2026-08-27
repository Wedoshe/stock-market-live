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
    news: 'GOVERNMENT ANNOUNCES A MAJOR SOLAR CONTRACT',
    description:
      'SunVolt wins a major government solar contract, changing expectations across the energy and transport sectors.',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        'SunVolt rises because the major government contract increases expected demand and future business.',
      fuelpower:
        'FuelPower falls as greater dependence on solar energy reduces demand for traditional fuel.',
      foodrush:
        'FoodRush rises because lower fuel costs reduce operating and cooking-related expenses.',
      movemax:
        'MoveMax rises because cheaper fuel lowers transport costs and encourages more vehicle use.',
      medicore:
        'MediCore stays unchanged because the solar contract has little direct effect on healthcare.',
    },
  },
  {
    id: 2,
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY',
    description:
      'Higher oil prices increase fuel costs and affect businesses differently across the economy.',
    decisionTime: 30,
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
    reasons: {
      sunvolt:
        'SunVolt rises because expensive oil makes alternative energy such as solar more attractive.',
      fuelpower:
        'FuelPower rises because higher oil prices increase the value of fuel companies.',
      foodrush:
        'FoodRush falls because higher fuel prices increase operating and delivery costs.',
      movemax:
        'MoveMax falls because expensive fuel increases transport costs and reduces vehicle usage.',
      medicore:
        'MediCore remains unchanged because oil prices have little direct impact on healthcare demand.',
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
  const [revealed, setRevealed] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)

  const [decisions, setDecisions] = useState({})
  const [activeTab, setActiveTab] = useState('market')

  // Portfolio graph history
  const [portfolioHistory, setPortfolioHistory] = useState([
    {
      round: 0,
      value: STARTING_CAPITAL,
    },
  ])

  // =========================
  // LOAD PLAYER
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
        showSupabaseError(checkError, 'Could not check the username.')
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
    setRevealed(false)
    setGameFinished(false)
    setDecisions({})
    setActiveTab('market')

    setPortfolioHistory([
      {
        round: 0,
        value: STARTING_CAPITAL,
      },
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

  const currentRound =
    round > 0 ? ROUND_DATA[round - 1] : null

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
  // DECISION
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

    const totalCost =
      stock.price * quantity

    if (totalCost > cash) return

    setCash(
      (previousCash) =>
        previousCash - totalCost
    )

    setStocks((previousStocks) =>
      previousStocks.map((item) => {
        if (item.id !== stockId) return item

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

    if (!stock || quantity > stock.shares) {
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
        if (item.id !== stockId) return item

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
  // SWIPE TRADING
  // =========================

  const SwipeStockCard = ({ stock }) => {
    const startX = useRef(null)
    const [offset, setOffset] = useState(0)

    const selected =
      decisions[stock.id]

    const selectedAction =
      selected?.action

    const selectedQuantity =
      selected?.quantity || 0

    const maxBuy =
      Math.floor(cash / stock.price)

    const handleStart = (event) => {
      if (
        !decisionOpen ||
        decisionLocked ||
        revealed
      ) {
        return
      }

      startX.current =
        event.touches?.[0]?.clientX ??
        event.clientX
    }

    const handleMove = (event) => {
      if (startX.current === null) return

      const currentX =
        event.touches?.[0]?.clientX ??
        event.clientX

      setOffset(currentX - startX.current)
    }

    const handleEnd = () => {
      if (startX.current === null) return

      const distance = offset

      if (distance > 80) {
        if (maxBuy > 0) {
          buyShares(stock.id, 1)
        }
      } else if (distance < -80) {
        if (stock.shares > 0) {
          sellShares(stock.id, 1)
        }
      }

      setOffset(0)
      startX.current = null
    }

    return (
      <div
        className="swipe-wrapper"
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={(event) => {
          if (startX.current !== null) {
            handleMove(event)
          }
        }}
        onMouseUp={handleEnd}
        onMouseLeave={() => {
          if (startX.current !== null) {
            handleEnd()
          }
        }}
      >
        <div className="swipe-hint buy-hint">
          BUY
        </div>

        <div className="swipe-hint sell-hint">
          SELL
        </div>

        <div
          className={`trading-card ${
            selectedAction
              ? `selected-${selectedAction.toLowerCase()}`
              : ''
          }`}
          style={{
            transform: `translateX(${offset}px)`,
          }}
        >
          <div className="trading-card-top">
            <div>
              <strong>
                {stock.name}
              </strong>

              <span>
                {stock.symbol}
              </span>
            </div>

            <strong className="trading-price">
              {formatMoney(stock.price)}
            </strong>
          </div>

          <div className="trading-card-middle">
            <div>
              <span>Owned</span>
              <strong>{stock.shares}</strong>
            </div>

            <div>
              <span>Decision</span>
              <strong>
                {selectedAction || 'NONE'}
              </strong>
            </div>

            {selectedQuantity > 0 && (
              <div>
                <span>Quantity</span>
                <strong>
                  {selectedQuantity}
                </strong>
              </div>
            )}
          </div>

          <div className="hold-row">
            <button
              type="button"
              className={
                selectedAction === 'HOLD'
                  ? 'hold-button active'
                  : 'hold-button'
              }
              onClick={(event) => {
                event.stopPropagation()
                holdStock(stock.id)
              }}
            >
              HOLD
            </button>
          </div>
        </div>
      </div>
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
    if (!currentRound || revealed) return

    setDecisionLocked(true)
    setDecisionOpen(false)
    setTimer(0)

    const updatedStocks =
      stocks.map((stock) => ({
        ...stock,
        price:
          currentRound.prices[stock.id] ??
          stock.price,
      }))

    setStocks(updatedStocks)

    setRevealed(true)
  }

  // =========================
  // NEXT ROUND
  // =========================

  const nextRound = () => {
    const newPortfolioValue =
      cash +
      stocks.reduce(
        (total, stock) =>
          total +
          (currentRound?.prices[stock.id] ??
            stock.price) *
            stock.shares,
        0
      )

    setPortfolioHistory((previous) => [
      ...previous,
      {
        round,
        value: newPortfolioValue,
      },
    ])

    if (round >= ROUND_DATA.length) {
      finishGame(newPortfolioValue)
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
  // FINISH
  // =========================

  const finishGame = async (
    finalValue = portfolioValue
  ) => {
    setGameFinished(true)

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
          'Could not save final score:',
          error
        )
      } else {
        const updatedPlayer = {
          ...currentPlayer,
          score: Math.round(finalValue),
        }

        setCurrentPlayer(updatedPlayer)

        localStorage.setItem(
          'stockMarketPlayer',
          JSON.stringify(updatedPlayer)
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
  // AUTH SCREEN
  // =========================

  if (!currentPlayer) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-logo">
              +
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

              <label>PIN</label>

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
  // START SCREEN
  // =========================

  if (!gameStarted) {
    return (
      <div className="app">
        <div className="game-start">
          <div className="game-logo">
            +
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
              <strong>Market News</strong>
              <span>
                React to information
              </span>
            </div>

            <div>
              <strong>
                Timed Decisions
              </strong>
              <span>
                30 seconds
              </span>
            </div>

            <div>
              <strong>
                Hidden Prices
              </strong>
              <span>
                Think before trading
              </span>
            </div>

            <div>
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
    const graphPoints =
      portfolioHistory.length > 1
        ? portfolioHistory
        : [
            {
              round: 0,
              value: portfolioValue,
            },
          ]

    return (
      <div className="app">
        <div className="final-screen">
          <span className="section-label">
            MARKET CLOSED
          </span>

          <h1>FINAL PORTFOLIO</h1>

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

          <div className="portfolio-chart final-chart">
            <div className="chart-heading">
              <div>
                <span>
                  PERFORMANCE
                </span>

                <h2>
                  Portfolio Growth
                </h2>
              </div>
            </div>

            <PortfolioGraph
              history={graphPoints}
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

          <LeaderboardTab
            active={
              activeTab ===
              'leaderboard'
            }
            onClick={() =>
              setActiveTab(
                'leaderboard'
              )
            }
          />
        </nav>

        <main className="game-main">
          {activeTab === 'leaderboard' ? (
            <Leaderboard
              currentPlayer={
                currentPlayer
              }
            />
          ) : activeTab ===
            'portfolio' ? (
            <PortfolioView
              stocks={stocks}
              cash={cash}
              portfolioValue={
                portfolioValue
              }
              profitLoss={
                profitLoss
              }
              history={
                portfolioHistory
              }
            />
          ) : (
            <section className="market-open-card">
              <div className="round-number">
                ROUND 1
              </div>

              <h2>MARKET OPEN</h2>

              <p>
                Study the companies.
                The first news event is
                coming.
              </p>

              <div className="stock-grid">
                {stocks.map(
                  (stock) => (
                    <div
                      className="stock-card"
                      key={stock.id}
                    >
                      <div className="stock-info">
                        <h3>
                          {stock.name}
                        </h3>

                        <span>
                          {stock.symbol}
                        </span>
                      </div>

                      <strong>
                        {formatMoney(
                          stock.price
                        )}
                      </strong>
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
            ROUND {round} / 2
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

        <LeaderboardTab
          active={
            activeTab ===
            'leaderboard'
          }
          onClick={() =>
            setActiveTab(
              'leaderboard'
            )
          }
        />
      </nav>

      <main className="game-main">
        {activeTab === 'leaderboard' ? (
          <Leaderboard
            currentPlayer={
              currentPlayer
            }
          />
        ) : activeTab ===
          'portfolio' ? (
          <PortfolioView
            stocks={stocks}
            cash={cash}
            portfolioValue={
              portfolioValue
            }
            profitLoss={
              profitLoss
            }
            history={
              portfolioHistory
            }
          />
        ) : (
          <>
            <section className="news-card">
              <div className="news-badge">
                MARKET NEWS
              </div>

              <h2>
                {currentRound.news}
              </h2>

              <p>
                {currentRound.description}
              </p>
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
                    Hold if you want to
                    keep your position.
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
                    <span>TIME</span>

                    <strong>
                      {timer}s
                    </strong>
                  </div>

                  <div>
                    <span>CASH</span>

                    <strong>
                      {formatMoney(
                        cash
                      )}
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

                <div className="swipe-instructions">
                  <span>
                    SWIPE RIGHT — BUY
                  </span>

                  <span>
                    SWIPE LEFT — SELL
                  </span>
                </div>

                <div className="trading-list">
                  {stocks.map(
                    (stock) => (
                      <SwipeStockCard
                        key={stock.id}
                        stock={stock}
                      />
                    )
                  )}
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
                  <div className="lock-icon">
                    LOCKED
                  </div>

                  <h2>
                    DECISION LOCKED
                  </h2>

                  <p>
                    Your choices are
                    final.
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

                  {stocks.map(
                    (stock) => {
                      const before =
                        stock.price ===
                        currentRound.prices[
                          stock.id
                        ]
                          ? INITIAL_STOCKS.find(
                              (
                                item
                              ) =>
                                item.id ===
                                stock.id
                            )?.price ??
                            100
                          : stock.price

                      const after =
                        currentRound
                          .prices[
                          stock.id
                        ]

                      const change =
                        after -
                        before

                      return (
                        <div
                          className="price-row"
                          key={stock.id}
                        >
                          <span>
                            {
                              stock.name
                            }
                          </span>

                          <span>
                            {formatMoney(
                              before
                            )}
                          </span>

                          <span
                            className={
                              change >=
                              0
                                ? 'price-up'
                                : 'price-down'
                            }
                          >
                            {change >=
                            0
                              ? '▲ '
                              : '▼ '}

                            {formatMoney(
                              after
                            )}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>

                <div className="reason-list">
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
                  )}
                </div>

                <div className="round-result">
                  <span>
                    CURRENT PORTFOLIO
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
                      round >= 2
                    ) {
                      const finalValue =
                        cash +
                        stocks.reduce(
                          (
                            total,
                            stock
                          ) =>
                            total +
                            currentRound
                              .prices[
                              stock.id
                            ] *
                              stock.shares,
                          0
                        )

                      setPortfolioHistory(
                        (
                          previous
                        ) => [
                          ...previous,
                          {
                            round,
                            value:
                              finalValue,
                          },
                        ]
                      )

                      finishGame(
                        finalValue
                      )
                    } else {
                      nextRound()
                    }
                  }}
                >
                  {round >= 2
                    ? 'MARKET CLOSED →'
                    : 'NEXT ROUND →'}
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// =========================
// PORTFOLIO GRAPH
// =========================

function PortfolioGraph({
  history,
}) {
  if (!history || history.length === 0) {
    return null
  }

  const width = 900
  const height = 300
  const padding = 35

  const values =
    history.map(
      (item) => item.value
    )

  const minValue =
    Math.min(...values) - 200

  const maxValue =
    Math.max(...values) + 200

  const range =
    maxValue - minValue || 1

  const points =
    history.map(
      (item, index) => {
        const x =
          history.length === 1
            ? width / 2
            : padding +
              (index /
                (history.length - 1)) *
                (width -
                  padding * 2)

        const y =
          height -
          padding -
          ((item.value -
            minValue) /
            range) *
            (height -
              padding * 2)

        return {
          x,
          y,
          round: item.round,
          value: item.value,
        }
      }
    )

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${
          point.x
        } ${point.y}`
    )
    .join(' ')

  return (
    <div className="chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="portfolio-svg"
        preserveAspectRatio="none"
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="chart-axis"
        />

        <path
          d={path}
          className="chart-line"
        />

        {points.map(
          (point) => (
            <g key={point.round}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                className="chart-dot"
              />

              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="chart-label"
              >
                {point.round === 0
                  ? 'START'
                  : `ROUND ${point.round}`}
              </text>
            </g>
          )
        )}
      </svg>
    </div>
  )
}

// =========================
// PORTFOLIO VIEW
// =========================

function PortfolioView({
  stocks,
  cash,
  portfolioValue,
  profitLoss,
  history,
}) {
  return (
    <section className="portfolio-page">
      <div className="portfolio-top">
        <div>
          <span className="section-label">
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
              ? 'profit-box positive'
              : 'profit-box negative'
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

      <div className="portfolio-chart">
        <div className="chart-heading">
          <div>
            <span>
              PERFORMANCE
            </span>

            <h2>
              Portfolio Growth
            </h2>
          </div>
        </div>

        <PortfolioGraph
          history={history}
        />
      </div>

      <div className="portfolio-stats">
        <div>
          <span>CASH</span>
          <strong>
            {formatMoney(cash)}
          </strong>
        </div>

        <div>
          <span>STOCK VALUE</span>
          <strong>
            {formatMoney(
              portfolioValue -
                cash
            )}
          </strong>
        </div>
      </div>

      <div className="holdings">
        <div className="section-label">
          HOLDINGS
        </div>

        {stocks.map(
          (stock) => (
            <div
              className="holding-row"
              key={stock.id}
            >
              <div>
                <strong>
                  {stock.name}
                </strong>

                <span>
                  {stock.symbol}
                </span>
              </div>

              <div>
                <span>
                  {stock.shares}{' '}
                  shares
                </span>

                <strong>
                  {formatMoney(
                    stock.price *
                      stock.shares
                  )}
                </strong>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}

// =========================
// LEADERBOARD
// =========================

function LeaderboardTab({
  active,
  onClick,
}) {
  return (
    <button
      className={
        active
          ? 'tab active'
          : 'tab'
      }
      onClick={onClick}
    >
      LEADERBOARD
    </button>
  )
}

function Leaderboard({
  currentPlayer,
}) {
  const [players, setPlayers] =
    useState([])
  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    const loadLeaderboard =
      async () => {
        setLoading(true)

        try {
          const {
            data,
            error,
          } = await supabase
            .from('players')
            .select(
              'id, username, score'
            )
            .order(
              'score',
              {
                ascending: false,
              }
            )

          if (error) {
            console.error(
              'Leaderboard error:',
              error
            )
            return
          }

          setPlayers(data || [])
        } finally {
          setLoading(false)
        }
      }

    loadLeaderboard()
  }, [])

  return (
    <section className="leaderboard">
      <div className="leaderboard-heading">
        <span className="section-label">
          LIVE RANKINGS
        </span>

        <h2>
          Leaderboard
        </h2>

        <p>
          Highest final portfolio
          value ranks first.
        </p>
      </div>

      {loading ? (
        <div className="loading-card">
          Loading rankings...
        </div>
      ) : players.length ===
        0 ? (
        <div className="loading-card">
          No players yet.
        </div>
      ) : (
        <div className="leaderboard-list">
          {players.map(
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
                    {
                      player.username
                    }
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
  )
}

export default App