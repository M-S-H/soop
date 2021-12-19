import { Card } from '@/models/Card'
import { Hand } from '@/models/Hand'
import { Pile } from '@/models/Pile'
import { Player } from '@/models/Player'
import { PlayerResult, RoundResults } from '@/models/RoundResults'
import router from '@/router'
import { State } from '@/store/state'
import store from '@/store/store'
import { cloneDeep, shuffle, sortBy } from 'lodash'
import randomColor from 'randomcolor'
import { Store } from 'vuex'
import { GameController } from './gameController'

export class BaseLocalGameController {
  /** The player's Id */
  protected playerId: string

  /** The vuex store */
  protected store: Store<State>

  constructor (playerId: string) {
    this.playerId = playerId
    this.store = store
  }

  /**
   * Ends the game
   */
  endGame (): void {
    throw new Error('Not Implemented')
  }

  /**
   * Flips the current plauyer's hand
   */
  flip () {
    this.store.dispatch('flip', this.playerId)
  }

  /**
   * Initialize
   */
  initialize (): Promise<boolean> {
    throw new Error('Not implemented')
  }

  /**
   * Attempts to play the given card on the given pile
   * @param card The card to play
   * @param pile The pile to play on
   */
  playCardOnPile (card: Card, pile: Pile): Promise<void> {
    return new Promise((resolve, reject) => {
      if (pile.color !== card.color || pile.currentValue !== card.value - 1) {
        console.log('rejected')
        reject(new Error('invalid card'))
      } else {
        const updatedPile = cloneDeep(pile)
        updatedPile.cards.push(card)
        updatedPile.currentValue = card.value
        updatedPile.topPlayerColor = card.player_color

        this.store.dispatch('updatePile', updatedPile)
        this.handlePlayedCard(card)
        resolve()
      }
    })
  }

  /**
   * Plays a card on the given row slot
   * @param card The card to play
   * @param nowNum The row slot to put the card in
   */
  playCardOnRow (card: Card, rowNum: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.store.getters.playerRow[rowNum] || card.location !== 'stack') {
        reject(new Error())
      } else {
        card.location = 'row'
        this.store.dispatch('setRowSlot', { playerId: this.playerId, rowNum: rowNum, card: card })
        // this.channel.push('moved_from_stack', {})
        // this.handlePlayedCard(card)
        this.saveState()
        resolve()
      }
    })
  }

  /**
   * Starts a new pile using the given card
   * @param card The card to begin a new pile with
   */
  startNewPile (card: Card): Promise<void> {
    return new Promise(resolve => {
      const pile: Pile = {
        id: String(store.state.piles.length),
        color: card.color,
        currentValue: 1,
        cards: [card],
        topPlayerColor: card.player_color
      }

      this.store.dispatch('addPile', pile)
      this.handlePlayedCard(card)
      resolve()
    })
  }

  startRound () {
    throw new Error('Not implemented')
  }

  /**
   * Handles a card having been played on the board or a pile
   * @param card The card that was played
   */
  private handlePlayedCard (card: Card) {
    if (card.location === 'stack') {
      this.store.dispatch('removeStackTop', this.playerId)
    } else if (card.location === 'row') {
      this.store.dispatch('removeCardFromRow', { playerId: this.playerId, card: card })
    } else if (card.location === 'hand') {
      this.store.dispatch('removeCardFromHand', { playerId: this.playerId, card: card })
    }

    if (this.store.getters.playerStack.length === 0) {
      this.soop()
    }

    this.saveState()
  }

  /**
   * Loads the current game state from localstorage
   * @returns State | null
   */
  protected loadState (): State | null {
    const stateSring = localStorage.getItem('soup:state')
    if (!stateSring) return null

    const state = JSON.parse(stateSring) as State
    return state
  }

  /**
   * Saves the current local state to local storage
   */
  protected saveState () {
    const stateString = JSON.stringify(this.store.state)
    localStorage.setItem('soup:state', stateString)
  }

  /**
   * Signals end of the round
   */
  protected soop () {
    this.store.dispatch('setSessionState', 'soopMessage')
    const scores = this.calculateRoundScores()
    const currrentSort = sortBy(this.store.state.players.map(p => p.id), id => {
      return this.store.state.players.find(p => p.id === id)?.score
    }).reverse()

    const newSort = sortBy(this.store.state.players.map(p => p.id), id => {
      return (this.store.state.players.find(p => p.id === id) as Player).score + scores[id]
    }).reverse()

    const roundResults: RoundResults = {
      roundWinner: this.playerId,
      topPlayer: newSort[0],
      playerResults: this.store.state.players.map(p => {
        const newRank = newSort.findIndex(id => id === p.id)
        const oldRank = currrentSort.findIndex(id => id === p.id)
        let delta = 'eq'
        if (oldRank > newRank) {
          delta = 'lt'
        } else if (newRank > oldRank) {
          delta = 'gt'
        }

        return {
          playerId: p.id,
          stack: this.store.state.stacks[p.id].length,
          cardsPlayed: 27 - this.store.state.hands[p.id].length,
          roundScore: scores[p.id],
          newScore: scores[p.id] + p.score,
          rank: newRank,
          delta: delta
        }
      })
    }

    this.store.dispatch('endRound', roundResults)
  }

  /**
   * Calculates each palyer's round score
   * @returns An object with the round score of each player
   */
  protected calculateRoundScores (): { [id: string]: number } {
    const roundScores = {} as { [id: string]: number }
    this.store.state.players.forEach(player => {
      const stackPenalty = this.store.state.stacks[player.id].length * 2
      const cardsPlayed = 27 - this.store.state.hands[player.id].length
      roundScores[player.id] = cardsPlayed - stackPenalty
    })

    return roundScores
  }
}

/**
 * Game controller for a bot
 */
class BotGameController extends BaseLocalGameController implements GameController {
  private params = {
    waitAvg: 0,
    waitSd: 0,
    pileInterval: 0,
    rowInterval: 0,
    stackInterval: 0
  }

  private intervals = []

  private timeouts = []

  constructor (playerId: string, difficulty: number) {
    super(playerId)
    // this.difficulty = difficulty
  }

  /**
   * Starts the bot's play
   */
  beginPlay (): void {
    this.tryPlayStack()
    this.tryPlayRow()
    this.tryPlayHand()
  }

  /**
   * Stops the bot from playing
   */
  stopPlay (): void {
    // Clear timeouts
    this.timeouts.forEach(t => clearTimeout(t))
    this.timeouts = []

    // Clear intervals
    this.intervals.forEach(i => clearInterval(i))
    this.intervals = []
  }

  tryPlayStack () {
    // console.log(`player ${this.playerId}: stack`)
    this.tryPlayCard(this.store.state.stacks[this.playerId][0])

    if (this.store.state.sessionState === 'in_progress') {
      setTimeout(() => {
        this.tryPlayStack()
      }, this.waitTime(1000, 6000))
    }
  }

  tryPlayRow () {
    // console.log(`player ${this.playerId}: stack`)
    for (const card of this.store.state.rows[this.playerId]) {
      if (card != null) {
        this.tryPlayCard(card)
      }
    }

    if (this.store.state.sessionState === 'in_progress') {
      setTimeout(() => {
        this.tryPlayRow()
      }, this.waitTime(500, 3000))
    }
  }

  tryPlayHand () {
    // console.log(`player ${this.playerId}: stack`)
    this.flip()
    const pos = this.store.state.handPositions[this.playerId]
    const topCard = this.store.state.hands[this.playerId][pos]
    this.tryPlayCard(topCard)

    if (this.store.state.sessionState === 'in_progress') {
      setTimeout(() => {
        this.tryPlayHand()
      }, this.waitTime(500, 2000))
    }
  }

  /**
   * Generates a random number amount of time
   * @returns A random duration of time in ms
   */
  waitTime (min: number, max: number): number {
    const u1 = Math.random()
    const u2 = Math.random()

    const player = this.store.state.players.find(p => p.id === this.playerId) as Player
    const modifier = player.skillModifier ? player.skillModifier : 0

    min = 100 + (modifier * 100)
    max = 300 + (modifier * 300)

    let z = Math.sqrt(-2 * Math.log2(u1)) * Math.cos(2 * Math.PI * u2)
    z = z / 10.0 + 0.5

    if (z > 1 || z < 0) {
      z = this.waitTime(min, max)
    } else {
      z *= (max - min) + min
    }

    return z
  }

  // MOVE
  tryPlayCard (card: Card) {
    if (!card) {
      return
    }
    console.log(`player ${card.player} : ${card.id} : ${card.location}`)
    if (card.value === 1) {
      setTimeout(() => {
        this.startNewPile(card).then(() => {
          if (this.store.state.stacks[this.playerId].length === 0) {
            this.soop()
          }
        })
      }, this.waitTime(500, 2000))
    } else {
      for (const pile of this.store.state.piles) {
        if (
          pile.currentValue === card.value - 1 &&
          pile.color === card.color
        ) {
          setTimeout(() => {
            this.playCardOnPile(card, pile).then(() => {
              if (this.store.state.stacks[this.playerId].length === 0) {
                this.soop()
              }
            })
          }, this.waitTime(500, 2000))
          break
        }
      }
    }
  }
}

/**
 * Game controller that conducts a local game with bots
 */
export class LocalGameController extends BaseLocalGameController implements GameController {
  /** The number of bots to create */
  private botNum: number

  /** Array of bot controllers */
  private bots: Array<BotGameController> = []

  constructor (playerId: string, botNum: number) {
    super(playerId)
    this.botNum = botNum
  }

  /**
   * Ends the game
   */
  endGame (): void {
    localStorage.clear()
    router.push('/')
  }

  /**
   * Sets up the initial state
   * @returns Promise
   */
  initialize (): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let state = this.loadState()
      if (!state) {
        const playerForm = JSON.parse(localStorage.getItem('soup:localPlayer') as string)
        const sessionId = localStorage.getItem('soup:sessionId')
        const playerId = localStorage.getItem('soup:playerId') as string

        if (!playerForm || !sessionId) { reject(new Error('no local info')) }

        const player = {
          id: playerId,
          name: playerForm.name,
          color: playerForm.color,
          delta: 'eq',
          score: 0,
          leader: true,
          rank: 0,
          ready: true,
          stack: 0,
          // eslint-disable-next-line @typescript-eslint/camelcase
          cards_played: 0
        }
        const players = this.initializePlayers()
        players.unshift(player)

        const newState: State = {
          playerId: player.id,
          sessionId: sessionId as string,
          players: players,
          hands: {},
          handPositions: {},
          stacks: {},
          rows: {},
          piles: [],
          lastRoundStats: { score: 0, cardsPlayed: 0, roundScore: 0, roundWinner: '' },
          currentRound: 0,
          totalRounds: playerForm.totalRounds,
          sessionState: 'waiting_for_players',
          gameEnded: false,
          gameOver: false,
          topPlayerId: ''
        }

        players.forEach(p => {
          newState.hands[p.id] = []
          newState.stacks[p.id] = []
          newState.handPositions[p.id] = -1
          newState.rows[p.id] = []
        })

        state = newState
      }

      this.store.dispatch('setState', state)
      this.saveState()
      resolve(true)
    })
  }

  /**
   * Starts the current round
   */
  startRound (): void {
    this.bots = []

    this.store.state.players.forEach(player => {
      const hand = this.generateHand(player)
      this.store.dispatch('setHand', { playerId: player.id, hand: hand })

      if (player.id !== this.playerId) {
        const gc = new BotGameController(player.id, 4)
        this.bots.push(gc)
        setTimeout(() => {
          gc.beginPlay()
        }, 4000)
      }
    })

    this.store.dispatch('setSessionState', 'in_progress')
    this.saveState()
  }

  /**
   * Creates a hand
   * @param player The player to create the hand for
   * @returns A new Hand
   */
  private generateHand (player: Player): Hand {
    // Generate cards
    let cards = [] as Array<Card>
    ['red', 'green', 'blue', 'yellow'].forEach(color => {
      for (let i = 0; i < 10; i++) {
        cards.push({
          id: `${player.id}:${color}:${i}`,
          color: color,
          value: i + 1,
          player: player.id,
          // eslint-disable-next-line @typescript-eslint/camelcase
          player_color: player.color,
          location: 'hand'
        })
      }
    })

    // Shuffle
    cards = shuffle(cards)

    // Assign
    const hand = {
      stack: cards.slice(0, 10),
      row: cards.slice(10, 13),
      hand: cards.slice(13, 40)
    } as Hand

    hand.stack.forEach(c => { c.location = 'stack' })
    hand.row.forEach(c => { c.location = 'row' })
    hand.hand.forEach(c => { c.location = 'hand' })

    // TODO: VERIFY

    return hand
  }

  /**
   * Creates an array of players
   * @returns An array of players
   */
  private initializePlayers (): Array<Player> {
    const players = [] as Array<Player>

    for (let i = 0; i < this.botNum; i++) {
      const player: Player = {
        id: String(i),
        name: String(i),
        color: randomColor(),
        delta: 'eq',
        score: 0,
        leader: false,
        rank: 0,
        ready: true,
        stack: 0,
        skillModifier: (Math.random() - 0.5) * 0.5,
        // eslint-disable-next-line @typescript-eslint/camelcase
        cards_played: 0
      }

      players.push(player)
    }

    return players
  }
}
