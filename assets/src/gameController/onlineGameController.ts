import { AxiosError, AxiosInstance } from 'axios'
import { GameController } from './gameController'
import store from '@/store/store'
import { Store } from 'vuex'
import { State } from '@/store/state'
import { Channel } from 'phoenix'
import axiosInstance from '@/common/axiosInstance'
import socketInstance from '@/common/socketInstance'
import { Player } from '@/models/Player'
import { Card } from '@/models/Card'
import { Pile } from '@/models/Pile'
import { RoundResults } from '@/models/RoundResults'

/**
 * Game controller that connects to a server
 */
export default class OnlineGameController implements GameController {
  /** The axios instance to make requests */
  private axios: AxiosInstance;

  /** The id of the player */
  private playerId: string;

  /** The Id of the game session */
  private sessionId: string

  /** The websocket connection */
  private channel!: Channel

  /** The vuex store */
  private store: Store<State>

  constructor (
    sessionId: string,
    playerId: string
  ) {
    this.store = store
    this.playerId = playerId
    this.sessionId = sessionId
    this.axios = axiosInstance
  }

  /**
   * Ends the curreent game
   */
  endGame () {
    this.channel.push('end_game', {})
  }

  /**
   * Flips the current plauyer's hand
   */
  flip () {
    this.store.dispatch('flip', this.playerId)
  }

  /**
   * Fetches the game session's information from the server
   */
  initialize (): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.axios.get(`/game/${this.sessionId}`).then(resp => {
        let state = this.loadState()
        if (!state) {
          state = {
            handPositions: {},
            stacks: {},
            rows: {}
          } as State

          state.handPositions[this.playerId] = -1
        }

        state.sessionId = this.sessionId
        state.playerId = this.playerId
        state.players = resp.data.players
        state.piles = resp.data.piles
        state.currentRound = resp.data.game.current_round
        state.totalRounds = resp.data.game.total_rounds
        state.sessionState = resp.data.game.state
        // state.handPositions[this.playerId] = -1
        state.gameEnded = false

        this.store.dispatch('setState', state)
        this.connectToWebsocket()
        resolve(true)
      }).catch((e: AxiosError) => {
        console.log(e)
        if (e.response && e.response.status === 404) {
          // Do something
          localStorage.clear()
          reject(e)
        }
      })
    })
  }

  /**
   * Marks the current player as ready and sets the player's hand
   */
  markReady () {
    this.channel.push('set_ready', {})
      .receive('ok', hand => {
        this.store.dispatch('setPlayerHand', hand)
        this.saveState()
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
        this.channel.push('moved_from_stack', {})
        this.saveState()
        resolve()
      }
    })
  }

  /**
   * Attempts to play the given card on the given pile
   * @param card The card to play
   * @param pile The pile to play on
   */
  playCardOnPile (card: Card, pile: Pile): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/camelcase
      this.channel.push('play_card', { card: card, pile_id: pile.id })
        .receive('ok', () => {
          this.handlePlayedCard(card)
          resolve()
        })
        .receive('error', () => {
          reject(new Error('Could not play card'))
        })
    })
  }

  /**
   * Starts a new pile using the given card
   * @param card The card to begin a new pile with
   */
  startNewPile (card: Card): Promise<void> {
    return new Promise(resolve => {
      this.channel.push('new_pile', card).receive('ok', () => {
        this.handlePlayedCard(card)
        resolve()
      })
    })
  }

  /**
   * Starts the current round
   */
  startRound () {
    this.channel.push('start_round', {})
  }

  /**
   * Add's a new pile to the board
   * @param pile The new Pile
   */
  private addPile (pile: Pile) {
    this.store.dispatch('addPile', pile)
    this.saveState()
  }

  /** Adds a player to the game state */
  private addPlayer (player: Player) {
    this.store.dispatch('addPlayer', player)
  }

  /**
   * Opens a websockete connection to the server
   */
  private connectToWebsocket () {
    socketInstance.connect()
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.channel = socketInstance.channel(`session:${this.sessionId}`, { player_id: this.store.state.playerId })
    this.channel.on('end_of_round', res => this.handleEndOfRound(res.results))
    this.channel.on('game_ended', () => this.handleGameEnded())
    this.channel.on('game_over', (res) => this.handleEndOfRound(res.results, true))
    this.channel.on('new_pile_created', (p: Pile) => this.addPile(p))
    this.channel.on('player_joined', (p: Player) => this.addPlayer(p))
    this.channel.on('player_ready', (p) => this.setPlayerReady(p.player_id))
    this.channel.on('round_started', () => this.roundStarted())
    this.channel.on('update_pile', (p: Pile) => this.updatePile(p))

    this.channel.join()
      .receive('ok', () => this.notifyPlayers())
  }

  /**
   * Handles the round ending
   * @param res Objecting containing the round results
   */
  private handleEndOfRound (res: RoundResults, gameOver = false) {
    this.store.dispatch('endRound', res)
    if (!gameOver) {
      this.saveState()
    } else {
      this.channel.leave()
      localStorage.clear()
    }
  }

  /**
   * Handles the response that the game has been ended
   */
  private handleGameEnded () {
    this.store.dispatch('gameEnded')
    this.channel.leave()
    localStorage.clear()
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
  private loadState (): State | null {
    const stateSring = localStorage.getItem('soup:state')
    if (!stateSring) return null

    const state = JSON.parse(stateSring) as State
    return state
  }

  /**
   * Notify others players that current player joined
   */
  private notifyPlayers () {
    this.channel.push('player_joined', { playerId: this.store.state.playerId })
  }

  /**
   * Sets the state to inprogress and resets players to not ready
   */
  private roundStarted () {
    this.store.dispatch('setPlayersNotReady')
    this.store.dispatch('setSessionState', 'in_progress')
  }

  /**
   * Saves the current local state to local storage
   */
  private saveState () {
    const stateString = JSON.stringify(this.store.state)
    localStorage.setItem('soup:state', stateString)
  }

  /**
   * Marks the given player as ready
   * @param playerId The player to set as ready
   */
  private setPlayerReady (playerId: string) {
    this.store.dispatch('setPlayerReady', playerId)
  }

  /**
   * Alerts server that stack is empty
   */
  private soop () {
    this.channel.push('soop', {})
  }

  /**
   * Updates the given pile
   * @param pile The updated pile
   */
  private updatePile (pile: Pile) {
    this.store.dispatch('updatePile', pile)
  }
}
