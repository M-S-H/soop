import { Card } from '@/models/Card'
import { Hand } from '@/models/Hand'
import { Pile } from '@/models/Pile'
import { Player } from '@/models/Player'
import { PlayerResult, RoundResults } from '@/models/RoundResults'
import { SessionState } from '@/models/SessionState'
import Vue from 'vue'
import Vuex, { StoreOptions } from 'vuex'
import { State } from './state'

Vue.use(Vuex)

const store: StoreOptions<State> = {
  state: {
    currentRound: 0,
    gameEnded: false,
    gameOver: false,
    hands: {},
    handPositions: {},
    lastRoundStats: {
      score: 0,
      cardsPlayed: 0,
      roundWinner: '',
      roundScore: 0
    },
    piles: [],
    playerId: '',
    players: [],
    rows: {},
    sessionId: '',
    sessionState: 'waiting_for_players',
    stacks: {},
    topPlayerId: '',
    totalRounds: 0
  },

  getters: {
    allPlayersReady: state => state.players.reduce((x: boolean, p: Player) => p.ready && x, true),
    lastRoundWinner: state => state.players.find(p => p.id === state.lastRoundStats.roundWinner),
    player: state => state.players.find(p => p.id === state.playerId),
    playerHand: state => state.hands[state.playerId],
    playerHandPosition: state => state.handPositions[state.playerId],
    playerRow: state => state.rows[state.playerId],
    playerStack: state => {
      return state.stacks[state.playerId]
    },
    topPlayer: state => {
      return state.players.find(p => p.id === state.topPlayerId)
    }
  },

  mutations: {
    /**
     * Add's a pile to the list
     * @param state The State
     * @param pile The Pile to add
     */
    addPile (state: State, pile: Pile) {
      state.piles.push(pile)
    },

    /**
     * Adds a player to the players array
     * @param state The State
     * @param player The player to be added
     */
    addPlayer (state: State, player: Player) {
      state.players.push(player)
    },

    /**
     * Resets the state to defaults
     * @param state The state
     */
    clearState (state: State) {
      state.currentRound = 0
      state.gameEnded = false
      state.gameOver = false
      state.hands = {}
      state.handPositions = {}
      state.lastRoundStats = {
        score: 0,
        cardsPlayed: 0,
        roundWinner: '',
        roundScore: 0
      }
      state.piles = []
      state.playerId = ''
      state.rows = {}
      state.sessionId = ''
      state.sessionState = 'waiting_for_players'
      state.stacks = {}
      state.topPlayerId = ''
      state.totalRounds = 0
    },

    /**
     * Ends the game
     * @param state The State
     */
    gameEnded (state: State) {
      state.gameEnded = true
    },

    /**
     * Increments the current round
     * @param state The Statte
     */
    incrementCurrentRound (state: State) {
      state.currentRound = state.currentRound + 1
    },

    /**
     * Removes a given card from a player's hand
     * @param state The State
     * @param payload Cotains a player id and the index of the card to remove
     */
    removeFromHand (state: State, payload: { playerId: string; handInd: number }) {
      state.hands[payload.playerId].splice(payload.handInd, 1)
    },

    /**
     * Removes a given card from a player's row
     * @param state The State
     * @param payload Contains a playerId and the index of the card to remove
     */
    removeFromRow (state: State, payload: { playerId: string; rowInd: number }) {
      state.rows[payload.playerId].splice(payload.rowInd, 1, null as any)
    },

    /**
     * Removes the top card from the given player's stack
     * @param state The State
     * @param playerId The player's Id
     */
    removeStackTop (state: State, playerId: string) {
      state.stacks[playerId].splice(0, 1)
    },

    /**
     * Marks the game as being oveer
     * @param state The State
     */
    setGameOver (state: State) {
      state.gameOver = true
    },

    /**
     * Sets the given player's hand
     * @param state The State
     * @param payload Object containing playerId and hand
     */
    setHand (state: State, payload: { playerId: string; hand: Hand }) {
      Vue.set(state.hands, payload.playerId, payload.hand.hand)
      Vue.set(state.rows, payload.playerId, payload.hand.row)
      Vue.set(state.stacks, payload.playerId, payload.hand.stack)
    },

    /**
     * Sets the given player's hand to the given position
     * @param state The State
     * @param payload Object containing player id and new position
     */
    setHandPosition (state: State, payload) {
      state.handPositions[payload.playerId] = payload.newPosition
    },

    /**
     * Updates the last round stats
     * @param state State
     * @param stats The object containing the new stats
     */
    setLastRoundStats (state: State, stats) {
      Object.assign(state.lastRoundStats, stats)
    },

    /**
     * Sets the given player's status to ready
     * @param state The State
     * @param playerId The Player's id
     */
    setPlayerReady (state: State, playerId: string) {
      const player = state.players.find(p => p.id === playerId)
      if (player) {
        player.ready = true
      }
    },

    /**
     * Sets all player's ready flags to false
     * @param state The State
     */
    setPlayersNotReady (state: State) {
      for (const player of state.players) {
        player.ready = false
      }
    },

    /**
     * Plays a card on a player's row
     * @param state The state
     * @param payload Object containing the player's id, the row slot, and the card
     */
    setRowSlot (state: State, payload: { playerId: string; rowNum: number; card: Card }) {
      state.rows[payload.playerId].splice(payload.rowNum, 1, payload.card)
    },

    /**
     * Sets the session's state to the one given
     * @param state The State
     * @param sessionState The new SessionState
     */
    setSessionState (state: State, sessionState: SessionState) {
      state.sessionState = sessionState
    },

    /**
     * Sets the current state to the one given
     * @param state The State
     * @param newState The new State
     */
    setState (state: State, newState: State) {
      Object.assign(state, newState)
    },

    /**
     * Sets the player with the highest score
     * @param state The State
     * @param playerId The player's id
     */
    setTopPlayer (state: State, playerId: string) {
      state.topPlayerId = playerId
    },

    /**
     * Updates the given pile
     * @param state The state
     * @param payload Objecting containing the index of the pile to be updated and the new pile info
     */
    updatePile (state: State, payload: { pileInd: number; pile: Pile }) {
      state.piles[payload.pileInd].topPlayerColor = payload.pile.topPlayerColor
      state.piles[payload.pileInd].currentValue = payload.pile.currentValue
    },

    /**
     * Updates the score of each player
     * @param state The State
     * @param playerResults The results of each player
     */
    updatePlayerResults (state: State, playerResults: Array<PlayerResult>) {
      playerResults.forEach(pr => {
        const playerInd = state.players.findIndex(p => p.id === pr.playerId)
        if (playerInd !== -1) {
          state.players[playerInd].score = pr.newScore
          state.players[playerInd].rank = pr.rank
          state.players[playerInd].delta = pr.delta

          // Vue.set(state.players[playerInd], )
        }
      })
    }
  },

  actions: {
    /**
     * Add's a pile to the list
     * @param pile The Pile to add
     */
    addPile ({ commit }, pile: Pile) {
      commit('addPile', pile)
    },

    /**
     * Adds a player to the state
     */
    addPlayer ({ commit }, player: Player) {
      if (!this.state.players.find(p => p.id === player.id)) {
        commit('addPlayer', player)
      }
    },

    /**
     * Resets the state to default values
     */
    clearState ({ commit }) {
      commit('clearState')
    },

    /**
     * Updates state when round has ended
     * @param results The results of the round
     */
    endRound ({ commit }, results: RoundResults) {
      // Update last round stats
      const currentPlayerResults = results.playerResults.find(pr => pr.playerId === this.state.playerId)
      const lastRoundStats = {
        stack: currentPlayerResults?.stack,
        cardsPlayed: currentPlayerResults?.cardsPlayed,
        roundScore: currentPlayerResults?.roundScore,
        roundWinner: results.roundWinner,
        score: currentPlayerResults?.newScore
      }
      commit('setLastRoundStats', lastRoundStats)

      commit('setTopPlayer', results.topPlayer)

      // Update players
      commit('updatePlayerResults', results.playerResults)

      commit('setSessionState', 'waiting_for_players')

      commit('incrementCurrentRound')

      if (this.state.currentRound === this.state.totalRounds) {
        commit('setGameOver')
      }
    },

    /**
     * Flips the hand for the given player
     * @param playerId The player
     */
    flip ({ commit }, playerId: string) {
      let pos = this.state.handPositions[playerId]
      const hand = this.state.hands[playerId]

      if (pos === hand.length - 1) {
        pos = -1
      } else if (pos + 3 >= hand.length) {
        pos = hand.length - 1
      } else {
        pos += 3
      }

      commit('setHandPosition', { playerId: playerId, newPosition: pos })
    },

    /**
     * Ends the game
     */
    gameEnded ({ commit }) {
      commit('gameEnded')
    },

    /**
     * Removes a given card from a player's row
     * @param payload Contains a playerId and card to remove
     */
    removeCardFromRow ({ commit }, payload: { playerId: string; card: Card }) {
      // Find the index of the card in the row
      const ind = this.state.rows[payload.playerId].findIndex(c => c && c.id === payload.card.id)
      if (ind !== -1) {
        commit('removeFromRow', { playerId: payload.playerId, rowInd: ind })
      }
    },

    /**
     * Removes the given card from a player's hand
     * @param payload Contains playerId and the card to remove
     */
    removeCardFromHand ({ commit }, payload: { playerId: string; card: Card }) {
      // Find index of card in hand
      const ind = this.state.hands[payload.playerId].findIndex(c => c.id === payload.card.id)
      const newPosition = this.state.handPositions[payload.playerId] - 1
      if (ind !== -1) {
        commit('removeFromHand', { playerId: payload.playerId, handInd: ind })
        commit('setHandPosition', { playerId: payload.playerId, newPosition: newPosition })
      }
    },

    /**
     * Removes the top card from given player's stack
     * @param playerId The player's Id
     */
    removeStackTop ({ commit }, playerId: string) {
      commit('removeStackTop', playerId)
    },

    /**
     * Set's the current player's hand
     * @param hand
     */
    setPlayerHand ({ commit }, hand: Hand) {
      commit('setHand', { playerId: this.state.playerId, hand: hand })
    },

    /**
     * Sets the given player's status to ready
     * @param playerId The Player
     */
    setPlayerReady ({ commit }, playerId: string) {
      commit('setPlayerReady', playerId)
    },

    /**
     * Sets all player's ready flag to false.
     */
    setPlayersNotReady ({ commit }) {
      commit('setPlayersNotReady')
    },

    /**
     * Set's a card on a given player's row
     * @param payload Object containing a player id, the row slot, and the card
     */
    setRowSlot ({ commit }, payload: { playerId: string; rowNum: number; card: Card }) {
      commit('setRowSlot', payload)
      commit('removeStackTop', payload.playerId)
    },

    /**
     * Sets the session's state to the one given
     * @param sessionState The SessionState
     */
    setSessionState ({ commit }, sessionState: SessionState) {
      commit('setSessionState', sessionState)
    },

    /**
     * Sets the entire state to the State object given.
     * @param stateObject State object
     */
    setState ({ commit }, stateObject: State) {
      commit('setState', stateObject)
    },

    /**
     * Updates the given pile
     * @param pile The updated Pile
     */
    updatePile ({ commit }, pile: Pile) {
      const ind = this.state.piles.findIndex(p => p.id === pile.id)
      if (ind !== -1) {
        commit('updatePile', { pileInd: ind, pile: pile })
      }
    }
  }
}

export default new Vuex.Store<State>(store)
