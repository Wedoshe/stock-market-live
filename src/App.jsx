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
  },
  {
    id: 'fuelpower',
    name: 'FuelPower',
    symbol: 'FUEL',
    icon: '🔥',
    price: 100,
    shares: 0,
  },
  {
    id: 'foodrush',
    name: 'FoodRush',
    symbol: 'FOOD',
    icon: '🍔',
    price: 100,
    shares: 0,
  },
  {
    id: 'movemax',
    name: 'MoveMax',
    symbol: 'MOVE',
    icon: '🚗',
    price: 100,
    shares: 0,
  },
  {
    id: 'medicore',
    name: 'MediCore',
    symbol: 'MEDI',
    icon: '🏥',
    price: 100,
    shares: 0,
  },
]

const ROUND_DATA = [
  {
    id: 1,
    title: 'BREAKING NEWS',
    news: 'SUNVOLT WINS A MAJOR GOVERNMENT SOLAR CONTRACT.',
    shortNews:
      'SunVolt wins a major government solar contract.',
    decisionTime: 30,
    prices: {
      sunvolt: 150,
      fuelpower: 80,
      foodrush: 130,
      movemax: 120,
      medicore: 100,
    },
  },
  {
    id: 2,
    title: 'MARKET INFORMATION',
    news: 'GLOBAL OIL PRICES RISE SHARPLY.',
    shortNews:
      'Global oil prices rise sharply.',
    decisionTime: 30,
    prices: {
      sunvolt: 180,
      fuelpower: 120,
      foodrush: 100,
      movemax: 90,
      medicore: 100,
    },
  },

  // Round 3 and Round 4 can be added here
  // when Hansika gives you the next news cards.
]

function formatMoney(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function App() {
  // =====================================================
  // ACCOUNT
  // =====================================================

  const [currentPlayer, setCurrentPlayer] =
    useState(null)

  const [authMode, setAuthMode] =
    useState('login')

  const [username, setUsername] =
    useState('')

  const [pin, setPin] =
    useState('')

  const [authMessage, setAuthMessage] =
    useState('')

  const [authLoading, setAuthLoading] =
    useState(false)

  // =====================================================
  // NAVIGATION
  // =====================================================

  const [activeTab, setActiveTab] =
    useState('market')

  // =====================================================
  // LEADERBOARD
  // =====================================================

  const [leaderboard, setLeaderboard] =
    useState([])

  const [leaderboardLoading, setLeaderboardLoading] =
    useState(false)

  // =====================================================
  // GAME
  // =====================================================

  const [gameStarted, setGameStarted] =
    useState(false)

  const [round, setRound] =
    useState(0)

  const [stocks, setStocks] =
    useState(
      INITIAL_STOCKS.map((stock) => ({
        ...stock,
      }))
    )

  const [cash, setCash] =
    useState(STARTING_CAPITAL)

  const [timer, setTimer] =
    useState(0)

  const [decisionOpen, setDecisionOpen] =
    useState(false)

  const [decisionLocked, setDecisionLocked] =
    useState(false)

  const [revealed, setRevealed] =
    useState(false)

  const [gameFinished, setGameFinished] =
    useState(false)

  // Records portfolio value after every market reveal.
  // Round 0 = starting capital.
  const [portfolioHistory, setPortfolioHistory] =
    useState([STARTING_CAPITAL])

  // =====================================================
  // SWIPE STATE
  // =====================================================

  const [swipe, setSwipe] =
    useState({
      id: null,
      startX: 0,
      currentX: 0,
    })

  // =====================================================
  // CURRENT ROUND
  // =====================================================

  const currentRound =
    round > 0
      ? ROUND_DATA[round - 1]
      : null

  // =====================================================
  // LOAD SAVED PLAYER
  // =====================================================

  useEffect(() => {
    const savedPlayer =
      localStorage.getItem(
        'stockMarketPlayer'
      )

    if (!savedPlayer) return

    try {
      const player =
        JSON.parse(savedPlayer)

      if (
        player?.id &&
        player?.username
      ) {
        setCurrentPlayer(player)
      } else {
        localStorage.removeItem(
          'stockMarketPlayer'
        )
      }
    } catch {
      localStorage.removeItem(
        'stockMarketPlayer'
      )
    }
  }, [])

  // =====================================================
  // LEADERBOARD
  // =====================================================

  const loadLeaderboard =
    async () => {
      setLeaderboardLoading(true)

      try {
        const {
          data,
          error,
        } = await supabase
          .from('players')
          .select(
            'id, username, score'
          )
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

        setLeaderboard(
          data || []
        )
      } catch (error) {
        console.error(
          'Leaderboard error:',
          error
        )
      } finally {
        setLeaderboardLoading(
          false
        )
      }
    }

  useEffect(() => {
    if (
      currentPlayer &&
      activeTab === 'leaderboard'
    ) {
      loadLeaderboard()
    }
  }, [
    currentPlayer,
    activeTab,
  ])

  // =====================================================
  // ACCOUNT ERROR
  // =====================================================

  const showSupabaseError = (
    error,
    fallback
  ) => {
    console.error(
      'Supabase error:',
      error
    )

    if (
      error?.code === '23505'
    ) {
      setAuthMessage(
        'That username already exists.'
      )
      return
    }

    if (
      error?.code === '42501'
    ) {
      setAuthMessage(
        'Database permission blocked this action.'
      )
      return
    }

    if (error?.message) {
      setAuthMessage(
        `Database error: ${error.message}`
      )
      return
    }

    setAuthMessage(fallback)
  }

  // =====================================================
  // CREATE ACCOUNT
  // =====================================================

  const createAccount =
    async () => {
      const cleanUsername =
        username.trim()

      const cleanPin =
        pin.trim()

      setAuthMessage('')

      if (
        !cleanUsername ||
        !cleanPin
      ) {
        setAuthMessage(
          'Enter a username and PIN.'
        )
        return
      }

      if (
        cleanUsername.length <
        3
      ) {
        setAuthMessage(
          'Username must be at least 3 characters.'
        )
        return
      }

      if (
        cleanPin.length < 4
      ) {
        setAuthMessage(
          'PIN must be at least 4 characters.'
        )
        return
      }

      setAuthLoading(true)

      try {
        const {
          data: existing,
          error: checkError,
        } = await supabase
          .from('players')
          .select(
            'id, username'
          )
          .eq(
            'username',
            cleanUsername
          )
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
            'That username already exists.'
          )
          return
        }

        const {
          data: player,
          error,
        } = await supabase
          .from('players')
          .insert({
            username:
              cleanUsername,
            pin: cleanPin,
            score:
              STARTING_CAPITAL,
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
          'Could not create account.'
        )
      } finally {
        setAuthLoading(false)
      }
    }

  // =====================================================
  // LOGIN
  // =====================================================

  const login =
    async () => {
      const cleanUsername =
        username.trim()

      const cleanPin =
        pin.trim()

      setAuthMessage('')

      if (
        !cleanUsername ||
        !cleanPin
      ) {
        setAuthMessage(
          'Enter a username and PIN.'
        )
        return
      }

      setAuthLoading(true)

      try {
        const {
          data: player,
          error,
        } = await supabase
          .from('players')
          .select('*')
          .eq(
            'username',
            cleanUsername
          )
          .eq(
            'pin',
            cleanPin
          )
          .maybeSingle()

        if (error) {
          showSupabaseError(
            error,
            'Login failed.'
          )
          return
        }

        if (!player) {
          setAuthMessage(
            'Incorrect username or PIN.'
          )
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

  // =====================================================
  // RESET
  // =====================================================

  const resetGame =
    () => {
      setGameStarted(false)
      setRound(0)

      setStocks(
        INITIAL_STOCKS.map(
          (stock) => ({
            ...stock,
          })
        )
      )

      setCash(
        STARTING_CAPITAL
      )

      setTimer(0)
      setDecisionOpen(false)
      setDecisionLocked(false)
      setRevealed(false)
      setGameFinished(false)

      setPortfolioHistory([
        STARTING_CAPITAL,
      ])

      setSwipe({
        id: null,
        startX: 0,
        currentX: 0,
      })
    }

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout =
    () => {
      localStorage.removeItem(
        'stockMarketPlayer'
      )

      setCurrentPlayer(null)
      resetGame()
      setActiveTab('market')
    }

  // =====================================================
  // START GAME
  // =====================================================

  const startGame =
    () => {
      resetGame()
      setGameStarted(true)
      setActiveTab('market')
    }

  // =====================================================
  // PORTFOLIO VALUE
  // =====================================================

  const stockValue =
    useMemo(() => {
      return stocks.reduce(
        (
          total,
          stock
        ) =>
          total +
          stock.price *
            stock.shares,
        0
      )
    }, [stocks])

  const portfolioValue =
    cash + stockValue

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    if (
      !decisionOpen ||
      decisionLocked ||
      timer <= 0
    ) {
      return
    }

    const interval =
      setInterval(() => {
        setTimer(
          (previous) => {
            if (
              previous <= 1
            ) {
              setDecisionLocked(
                true
              )

              setDecisionOpen(
                false
              )

              return 0
            }

            return previous - 1
          }
        )
      }, 1000)

    return () =>
      clearInterval(
        interval
      )
  }, [
    decisionOpen,
    decisionLocked,
    timer,
  ])

  // =====================================================
  // START DECISION
  // =====================================================

  const startDecision =
    () => {
      if (!currentRound)
        return

      setDecisionLocked(
        false
      )

      setRevealed(false)

      setTimer(
        currentRound.decisionTime
      )

      setDecisionOpen(true)
    }

  // =====================================================
  // TRADE
  //
  // IMPORTANT:
  // Trading happens at the CURRENT known price.
  // The new market price is hidden until reveal.
  // =====================================================

  const executeTrade =
    (
      stockId,
      action,
      quantity = 1
    ) => {
      if (
        !decisionOpen ||
        decisionLocked ||
        revealed
      ) {
        return false
      }

      const stock =
        stocks.find(
          (item) =>
            item.id ===
            stockId
        )

      if (!stock)
        return false

      const price =
        stock.price

      // BUY
      if (
        action === 'BUY'
      ) {
        const cost =
          price *
          quantity

        if (
          cost > cash
        ) {
          return false
        }

        setCash(
          (previous) =>
            previous - cost
        )

        setStocks(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                stockId
                  ? {
                      ...item,
                      shares:
                        item.shares +
                        quantity,
                    }
                  : item
            )
        )

        return true
      }

      // SELL
      if (
        action === 'SELL'
      ) {
        if (
          stock.shares <
          quantity
        ) {
          return false
        }

        const value =
          price *
          quantity

        setCash(
          (previous) =>
            previous + value
        )

        setStocks(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                stockId
                  ? {
                      ...item,
                      shares:
                        item.shares -
                        quantity,
                    }
                  : item
            )
        )

        return true
      }

      return false
    }

  // =====================================================
  // HOLD
  // =====================================================

  const holdStock =
    () => {
      if (
        !decisionOpen ||
        decisionLocked ||
        revealed
      ) {
        return
      }

      // HOLD intentionally does nothing.
    }

  // =====================================================
  // SWIPE
  //
  // Right = BUY
  // Left = SELL
  // =====================================================

  const handlePointerDown =
    (
      event,
      stockId
    ) => {
      if (
        !decisionOpen ||
        decisionLocked ||
        revealed
      ) {
        return
      }

      event.currentTarget.setPointerCapture(
        event.pointerId
      )

      setSwipe({
        id: stockId,
        startX:
          event.clientX,
        currentX:
          event.clientX,
      })
    }

  const handlePointerMove =
    (event) => {
      if (
        swipe.id === null
      ) {
        return
      }

      setSwipe(
        (previous) => ({
          ...previous,
          currentX:
            event.clientX,
        })
      )
    }

  const handlePointerUp =
    (event) => {
      if (
        swipe.id === null
      ) {
        return
      }

      const distance =
        swipe.currentX -
        swipe.startX

      const stockId =
        swipe.id

      setSwipe({
        id: null,
        startX: 0,
        currentX: 0,
      })

      // Right swipe = BUY
      if (
        distance >= 80
      ) {
        executeTrade(
          stockId,
          'BUY',
          1
        )

        return
      }

      // Left swipe = SELL
      if (
        distance <= -80
      ) {
        executeTrade(
          stockId,
          'SELL',
          1
        )
      }
    }

  // =====================================================
  // LOCK DECISIONS
  // =====================================================

  const lockDecision =
    () => {
      setDecisionLocked(
        true
      )

      setDecisionOpen(
        false
      )

      setTimer(0)

      setSwipe({
        id: null,
        startX: 0,
        currentX: 0,
      })
    }

  // =====================================================
  // REVEAL NEW PRICES
  // =====================================================

  const revealPrices =
    async () => {
      if (
        !currentRound ||
        revealed
      ) {
        return
      }

      const newStocks =
        stocks.map(
          (stock) => ({
            ...stock,
            price:
              currentRound
                .prices[
                stock.id
              ] ??
              stock.price,
          })
        )

      const newStockValue =
        newStocks.reduce(
          (
            total,
            stock
          ) =>
            total +
            stock.price *
              stock.shares,
          0
        )

      const newPortfolioValue =
        cash +
        newStockValue

      setStocks(
        newStocks
      )

      setPortfolioHistory(
        (previous) => [
          ...previous,
          newPortfolioValue,
        ]
      )

      setDecisionLocked(
        true
      )

      setDecisionOpen(
        false
      )

      setTimer(0)
      setRevealed(true)

      // Save current score after every round.
      if (
        currentPlayer?.id
      ) {
        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'players'
              )
              .update({
                score:
                  Math.round(
                    newPortfolioValue
                  ),
              })
              .eq(
                'id',
                currentPlayer.id
              )
              .select()
              .single()

          if (
            !error &&
            data
          ) {
            setCurrentPlayer(
              data
            )

            localStorage.setItem(
              'stockMarketPlayer',
              JSON.stringify(
                data
              )
            )
          }
        } catch (error) {
          console.error(
            'Score save failed:',
            error
          )
        }
      }
    }

  // =====================================================
  // NEXT ROUND
  // =====================================================

  const nextRound =
    () => {
      if (
        round >=
        ROUND_DATA.length
      ) {
        setGameFinished(
          true
        )

        return
      }

      setRound(
        (previous) =>
          previous + 1
      )

      setDecisionOpen(false)
      setDecisionLocked(false)
      setRevealed(false)
      setTimer(0)
      setSwipe({
        id: null,
        startX: 0,
        currentX: 0,
      })
    }

  // =====================================================
  // SAVE FINAL SCORE
  // =====================================================

  useEffect(() => {
    if (
      !gameFinished ||
      !currentPlayer?.id
    ) {
      return
    }

    const saveFinalScore =
      async () => {
        try {
          await supabase
            .from(
              'players'
            )
            .update({
              score:
                Math.round(
                  portfolioValue
                ),
            })
            .eq(
              'id',
              currentPlayer.id
            )
        } catch (error) {
          console.error(
            'Final score save failed:',
            error
          )
        }
      }

    saveFinalScore()
  }, [
    gameFinished,
  ])

  // =====================================================
  // AUTH SCREEN
  // =====================================================

  if (!currentPlayer) {
    return (
      <div className="app auth-page">
        <div className="auth-card">

          <div className="auth-logo">
            📈
          </div>

          <h1>
            StockMarket
          </h1>

          <p className="auth-subtitle">
            Think. Trade. Win.
          </p>

          <div className="auth-tabs">

            <button
              className={
                authMode === 'login'
                  ? 'auth-tab active'
                  : 'auth-tab'
              }
              onClick={() => {
                setAuthMode(
                  'login'
                )

                setAuthMessage(
                  ''
                )
              }}
            >
              LOGIN
            </button>

            <button
              className={
                authMode === 'create'
                  ? 'auth-tab active'
                  : 'auth-tab'
              }
              onClick={() => {
                setAuthMode(
                  'create'
                )

                setAuthMessage(
                  ''
                )
              }}
            >
              CREATE
            </button>

          </div>

          <div className="auth-form">

            <label>
              Username
            </label>

            <input
              value={username}
              placeholder="Your username"
              autoComplete="username"
              onChange={(event) =>
                setUsername(
                  event.target
                    .value
                )
              }
            />

            <label>
              PIN
            </label>

            <input
              value={pin}
              type="password"
              inputMode="numeric"
              placeholder="Your PIN"
              autoComplete={
                authMode ===
                'login'
                  ? 'current-password'
                  : 'new-password'
              }
              onChange={(event) =>
                setPin(
                  event.target
                    .value
                )
              }
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
                authMode ===
                'login'
                  ? login
                  : createAccount
              }
            >
              {authLoading
                ? 'PLEASE WAIT...'
                : authMode ===
                  'login'
                ? 'LOGIN'
                : 'CREATE ACCOUNT'}
            </button>

          </div>

          <p className="auth-note">
            Your account is used for
            your game score.
          </p>

        </div>
      </div>
    )
  }

  // =====================================================
  // MAIN NAV
  // =====================================================

  const tabs = (
    <nav className="bottom-tabs">

      <button
        className={
          activeTab === 'market'
            ? 'bottom-tab active'
            : 'bottom-tab'
        }
        onClick={() =>
          setActiveTab(
            'market'
          )
        }
      >
        <span>
          📈
        </span>
        Market
      </button>

      <button
        className={
          activeTab ===
          'portfolio'
            ? 'bottom-tab active'
            : 'bottom-tab'
        }
        onClick={() =>
          setActiveTab(
            'portfolio'
          )
        }
      >
        <span>
          💼
        </span>
        Portfolio
      </button>

      <button
        className={
          activeTab ===
          'leaderboard'
            ? 'bottom-tab active'
            : 'bottom-tab'
        }
        onClick={() => {
          setActiveTab(
            'leaderboard'
          )
          loadLeaderboard()
        }}
      >
        <span>
          🏆
        </span>
        Leaderboard
      </button>

    </nav>
  )

  // =====================================================
  // LEADERBOARD TAB
  // =====================================================

  if (
    activeTab ===
    'leaderboard'
  ) {
    return (
      <div className="app">

        <header className="top-bar">

          <div>
            <span className="eyebrow">
              STOCK MARKET LIVE
            </span>

            <h1>
              Leaderboard
            </h1>
          </div>

          <div className="user-chip">
            {currentPlayer.username}
          </div>

        </header>

        <main className="screen">

          <div className="leaderboard-header">

            <div>
              <span className="eyebrow">
                RANKINGS
              </span>

              <h2>
                Top Investors
              </h2>
            </div>

            <button
              className="refresh-button"
              onClick={
                loadLeaderboard
              }
            >
              ↻
            </button>

          </div>

          {leaderboardLoading ? (

            <div className="empty-card">
              Loading...
            </div>

          ) : leaderboard.length ===
            0 ? (

            <div className="empty-card">
              No scores yet.
            </div>

          ) : (

            <div className="leaderboard-list">

              {leaderboard.map(
                (
                  player,
                  index
                ) => {

                  const isYou =
                    player.id ===
                    currentPlayer.id

                  return (
                    <div
                      className={
                        isYou
                          ? 'leader-row you'
                          : 'leader-row'
                      }
                      key={
                        player.id
                      }
                    >

                      <div className="leader-rank">
                        {index === 0
                          ? '🥇'
                          : index === 1
                          ? '🥈'
                          : index === 2
                          ? '🥉'
                          : `#${index + 1}`}
                      </div>

                      <div className="leader-name">

                        <strong>
                          {
                            player.username
                          }
                        </strong>

                        {isYou && (
                          <span>
                            YOU
                          </span>
                        )}

                      </div>

                      <strong className="leader-score">
                        {formatMoney(
                          player.score ||
                            0
                        )}
                      </strong>

                    </div>
                  )
                }
              )}

            </div>

          )}

        </main>

        {tabs}

      </div>
    )
  }

  // =====================================================
  // PORTFOLIO TAB
  // =====================================================

  if (
    activeTab ===
    'portfolio'
  ) {
    const maxHistory =
      Math.max(
        ...portfolioHistory
      )

    const minHistory =
      Math.min(
        ...portfolioHistory
      )

    const historyRange =
      Math.max(
        1,
        maxHistory -
          minHistory
      )

    const graphWidth = 700
    const graphHeight = 250
    const graphPadding = 30

    const points =
      portfolioHistory
        .map(
          (
            value,
            index
          ) => {
            const x =
              portfolioHistory.length ===
              1
                ? graphWidth /
                  2
                : graphPadding +
                  (index /
                    (portfolioHistory.length -
                      1)) *
                    (graphWidth -
                      graphPadding *
                        2)

            const y =
              graphHeight -
              graphPadding -
              ((value -
                minHistory) /
                historyRange) *
                (graphHeight -
                  graphPadding *
                    2)

            return `${x},${y}`
          }
        )
        .join(' ')

    return (
      <div className="app">

        <header className="top-bar">

          <div>
            <span className="eyebrow">
              PORTFOLIO
            </span>

            <h1>
              {formatMoney(
                portfolioValue
              )}
            </h1>
          </div>

          <div className="user-chip">
            {currentPlayer.username}
          </div>

        </header>

        <main className="screen">

          <section className="portfolio-hero">

            <span>
              TOTAL VALUE
            </span>

            <strong>
              {formatMoney(
                portfolioValue
              )}
            </strong>

            <em
              className={
                portfolioValue >=
                STARTING_CAPITAL
                  ? 'profit'
                  : 'loss'
              }
            >
              {portfolioValue >=
              STARTING_CAPITAL
                ? '▲'
                : '▼'}{' '}
              {formatMoney(
                Math.abs(
                  portfolioValue -
                    STARTING_CAPITAL
                )
              )}
            </em>

          </section>

          <section className="graph-card">

            <div className="card-heading">

              <div>
                <span className="eyebrow">
                  PERFORMANCE
                </span>

                <h2>
                  Portfolio
                </h2>
              </div>

              <span>
                Round {round}
              </span>

            </div>

            <div className="graph-wrapper">

              <svg
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                className="portfolio-graph"
                preserveAspectRatio="none"
              >

                <polyline
                  points={
                    points
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {portfolioHistory.map(
                  (
                    value,
                    index
                  ) => {

                    const x =
                      portfolioHistory.length ===
                      1
                        ? graphWidth /
                          2
                        : graphPadding +
                          (index /
                            (portfolioHistory.length -
                              1)) *
                            (graphWidth -
                              graphPadding *
                                2)

                    const y =
                      graphHeight -
                      graphPadding -
                      ((value -
                        minHistory) /
                        historyRange) *
                        (graphHeight -
                          graphPadding *
                            2)

                    return (
                      <circle
                        key={
                          index
                        }
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

            <div className="round-labels">

              {portfolioHistory.map(
                (
                  value,
                  index
                ) => (
                  <span
                    key={
                      index
                    }
                  >
                    R{index}
                  </span>
                )
              )}

            </div>

          </section>

          <section className="holdings-card">

            <div className="card-heading">

              <div>
                <span className="eyebrow">
                  HOLDINGS
                </span>

                <h2>
                  Your Shares
                </h2>
              </div>

            </div>

            <div className="holdings-list">

              {stocks.map(
                (stock) => (
                  <div
                    className="holding-row"
                    key={
                      stock.id
                    }
                  >

                    <div className="holding-name">

                      <span>
                        {stock.icon}
                      </span>

                      <div>
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

                    </div>

                    <div className="holding-shares">
                      {stock.shares}
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

          </section>

        </main>

        {tabs}

      </div>
    )
  }

  // =====================================================
  // FINAL SCREEN
  // =====================================================

  if (gameFinished) {
    return (
      <div className="app">

        <header className="top-bar">

          <div>
            <span className="eyebrow">
              MARKET CLOSED
            </span>

            <h1>
              Final Portfolio
            </h1>
          </div>

          <div className="user-chip">
            {currentPlayer.username}
          </div>

        </header>

        <main className="screen">

          <section className="final-card">

            <span>
              FINAL VALUE
            </span>

            <strong>
              {formatMoney(
                portfolioValue
              )}
            </strong>

            <em
              className={
                portfolioValue >=
                STARTING_CAPITAL
                  ? 'profit'
                  : 'loss'
              }
            >
              {portfolioValue >=
              STARTING_CAPITAL
                ? '▲ PROFIT'
                : '▼ LOSS'}{' '}
              {formatMoney(
                Math.abs(
                  portfolioValue -
                    STARTING_CAPITAL
                )
              )}
            </em>

          </section>

          <section className="graph-card">

            <div className="card-heading">
              <div>
                <span className="eyebrow">
                  PERFORMANCE
                </span>

                <h2>
                  Game Graph
                </h2>
              </div>
            </div>

            <div className="graph-wrapper">

              <svg
                viewBox="0 0 700 250"
                className="portfolio-graph"
                preserveAspectRatio="none"
              >

                {(() => {

                  const max =
                    Math.max(
                      ...portfolioHistory
                    )

                  const min =
                    Math.min(
                      ...portfolioHistory
                    )

                  const range =
                    Math.max(
                      1,
                      max - min
                    )

                  const points =
                    portfolioHistory
                      .map(
                        (
                          value,
                          index
                        ) => {

                          const x =
                            portfolioHistory.length ===
                            1
                              ? 350
                              : 30 +
                                (index /
                                  (portfolioHistory.length -
                                    1)) *
                                  640

                          const y =
                            220 -
                            ((value -
                              min) /
                              range) *
                              190

                          return `${x},${y}`
                        }
                      )
                      .join(' ')

                  return (
                    <>
                      <polyline
                        points={
                          points
                        }
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {portfolioHistory.map(
                        (
                          value,
                          index
                        ) => {

                          const x =
                            portfolioHistory.length ===
                            1
                              ? 350
                              : 30 +
                                (index /
                                  (portfolioHistory.length -
                                    1)) *
                                  640

                          const y =
                            220 -
                            ((value -
                              min) /
                              range) *
                              190

                          return (
                            <circle
                              key={
                                index
                              }
                              cx={
                                x
                              }
                              cy={
                                y
                              }
                              r="7"
                              fill="currentColor"
                            />
                          )
                        }
                      )}
                    </>
                  )
                })()}

              </svg>

            </div>

          </section>

          <button
            className="primary-button full"
            onClick={() => {
              setGameFinished(
                false
              )
              setGameStarted(
                false
              )
              setRound(0)
              setActiveTab(
                'market'
              )
            }}
          >
            NEW GAME
          </button>

          <button
            className="secondary-button full"
            onClick={() => {
              setActiveTab(
                'leaderboard'
              )
              loadLeaderboard()
            }}
          >
            VIEW LEADERBOARD
          </button>

        </main>

        {tabs}

      </div>
    )
  }

  // =====================================================
  // MARKET TAB
  // =====================================================

  return (
    <div className="app">

      <header className="top-bar">

        <div>

          <span className="eyebrow">
            STOCK MARKET LIVE
          </span>

          <h1>
            {round === 0
              ? 'Market'
              : `Round ${round}`}
          </h1>

        </div>

        <div className="top-money">

          <span>
            CASH
          </span>

          <strong>
            {formatMoney(cash)}
          </strong>

        </div>

      </header>

      <main className="screen">

        {!gameStarted ? (

          <section className="start-card">

            <div className="start-icon">
              📈
            </div>

            <span className="eyebrow">
              WELCOME
            </span>

            <h2>
              {currentPlayer.username}
            </h2>

            <div className="start-money">

              <span>
                Starting Capital
              </span>

              <strong>
                {formatMoney(
                  STARTING_CAPITAL
                )}
              </strong>

            </div>

            <p>
              Read the news.
              Make your move.
              Beat the market.
            </p>

            <button
              className="primary-button full"
              onClick={
                startGame
              }
            >
              START GAME
            </button>

            <button
              className="secondary-button full"
              onClick={
                logout
              }
            >
              LOG OUT
            </button>

          </section>

        ) : round === 0 ? (

          <section>

            <div className="market-intro">

              <span className="eyebrow">
                ROUND 0
              </span>

              <h2>
                Market Open
              </h2>

              <p>
                Starting prices.
                Study the companies.
              </p>

            </div>

            <div className="mini-stock-grid">

              {stocks.map(
                (stock) => (
                  <div
                    className="mini-stock"
                    key={
                      stock.id
                    }
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
              className="primary-button full"
              onClick={() =>
                setRound(1)
              }
            >
              NEXT →
            </button>

          </section>

        ) : (

          <section>

            {/* NEWS */}

            {!decisionOpen &&
              !decisionLocked &&
              !revealed && (
                <div className="news-card-modern">

                  <span className="news-badge-modern">
                    🚨{' '}
                    {
                      currentRound.title
                    }
                  </span>

                  <h2>
                    {
                      currentRound.news
                    }
                  </h2>

                  <p>
                    {
                      currentRound.shortNews
                    }
                  </p>

                  <div className="news-bottom">

                    <div>
                      <span>
                        DECIDE IN
                      </span>

                      <strong>
                        {
                          currentRound.decisionTime
                        }s
                      </strong>
                    </div>

                    <button
                      className="primary-button"
                      onClick={
                        startDecision
                      }
                    >
                      START
                    </button>

                  </div>

                </div>
              )}

            {/* DECISION MODE */}

            {decisionOpen && (
              <div>

                <div className="decision-top">

                  <div>

                    <span className="eyebrow">
                      MAKE YOUR MOVES
                    </span>

                    <h2>
                      {timer}s
                    </h2>

                  </div>

                  <div className="compact-portfolio">

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

                <div className="swipe-help">
                  <span className="buy-help">
                    ← SWIPE RIGHT = BUY
                  </span>

                  <span>
                    HOLD
                  </span>

                  <span className="sell-help">
                    SWIPE LEFT = SELL →
                  </span>
                </div>

                <div className="trade-list">

                  {stocks.map(
                    (stock) => {

                      const dragDistance =
                        swipe.id ===
                        stock.id
                          ? swipe.currentX -
                            swipe.startX
                          : 0

                      const direction =
                        dragDistance >
                        15
                          ? 'buying'
                          : dragDistance <
                            -15
                          ? 'selling'
                          : ''

                      return (
                        <div
                          className={`trade-card ${direction}`}
                          key={
                            stock.id
                          }
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
                          onPointerCancel={() =>
                            setSwipe(
                              {
                                id: null,
                                startX: 0,
                                currentX: 0,
                              }
                            )
                          }
                          style={{
                            transform:
                              swipe.id ===
                              stock.id
                                ? `translateX(${Math.max(
                                    -105,
                                    Math.min(
                                      105,
                                      dragDistance
                                    )
                                  )}px)`
                                : undefined,
                          }}
                        >

                          <div className="swipe-action buy-swipe">
                            BUY
                          </div>

                          <div className="swipe-action sell-swipe">
                            SELL
                          </div>

                          <div className="trade-main">

                            <div className="trade-company">

                              <span className="trade-icon">
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
                                    formatMoney(
                                      stock.price
                                    )
                                  }{' '}
                                  / share
                                </small>

                              </div>

                            </div>

                            <div className="trade-owned">

                              <span>
                                OWNED
                              </span>

                              <strong>
                                {
                                  stock.shares
                                }
                              </strong>

                            </div>

                            <button
                              className="hold-button"
                              onPointerDown={(
                                event
                              ) =>
                                event.stopPropagation()
                              }
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation()
                                holdStock()
                              }}
                            >
                              HOLD
                            </button>

                          </div>

                          <div className="trade-tip">
                            Swipe →
                            to buy •
                            Swipe ←
                            to sell
                          </div>

                        </div>
                      )
                    }
                  )}

                </div>

                <button
                  className="lock-button full"
                  onClick={
                    lockDecision
                  }
                >
                  🔒 LOCK DECISIONS
                </button>

              </div>
            )}

            {/* LOCKED */}

            {decisionLocked &&
              !revealed && (
                <div className="locked-card-modern">

                  <div className="lock-big">
                    🔒
                  </div>

                  <strong>
                    DECISIONS LOCKED
                  </strong>

                  <span>
                    Nobody can change
                    their moves now.
                  </span>

                  <button
                    className="primary-button full"
                    onClick={
                      revealPrices
                    }
                  >
                    REVEAL MARKET
                  </button>

                </div>
              )}

            {/* REVEAL */}

            {revealed && (
              <div>

                <div className="reveal-header">
                  <span className="eyebrow">
                    MARKET REVEAL
                  </span>

                  <h2>
                    What happened?
                  </h2>
                </div>

                <div className="reveal-list">

                  {stocks.map(
                    (stock) => {

                      const oldPrice =
                        round ===
                        1
                          ? 100
                          : ROUND_DATA[
                              round -
                                2
                            ]?.prices[
                              stock.id
                            ] ??
                            100

                      const change =
                        stock.price -
                        oldPrice

                      return (
                        <div
                          className="reveal-row"
                          key={
                            stock.id
                          }
                        >

                          <div className="reveal-name">

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

                          </div>

                          <span>
                            {formatMoney(
                              oldPrice
                            )}
                          </span>

                          <strong
                            className={
                              change >=
                              0
                                ? 'profit'
                                : 'loss'
                            }
                          >
                            {change >=
                            0
                              ? '▲'
                              : '▼'}{' '}
                            {formatMoney(
                              stock.price
                            )}
                          </strong>

                        </div>
                      )
                    }
                  )}

                </div>

                <div className="round-result">

                  <span>
                    YOUR PORTFOLIO
                  </span>

                  <strong>
                    {formatMoney(
                      portfolioValue
                    )}
                  </strong>

                </div>

                <button
                  className="primary-button full"
                  onClick={() => {
                    if (
                      round >=
                      ROUND_DATA.length
                    ) {
                      setGameFinished(
                        true
                      )
                    } else {
                      nextRound()
                    }
                  }}
                >
                  {round >=
                  ROUND_DATA.length
                    ? 'MARKET CLOSED'
                    : 'NEXT ROUND →'}
                </button>

              </div>
            )}

          </section>
        )}

      </main>

      {tabs}

    </div>
  )
}

export default App