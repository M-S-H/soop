<template>
  <div class="soop-game">
    <!-- Header -->
    <transition name="slide-down">
      <header v-if="channel !== null">
        <div class="options" @click="showMenu = true">
          <svg class="bars" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
            viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve">
          <path class="top" d="M50,9.5H0V3.8C0,3.4,0.4,3,1,3h48c0.5,0,1,0.4,1,0.8V9.5z"/>
          <rect class="mid" y="21.8" width="50" height="6.5"/>
          <path class="bottom" d="M0,40.5h50v5.7c0,0.4-0.5,0.8-1,0.8H1c-0.6,0-1-0.4-1-0.8V40.5z"/>
          </svg>
        </div>
        <span class="session-id">{{ this.sessionId }}</span>
      </header>
    </transition>

    <!-- Messages -->
    <transition name="slide-up-fade">
    <div class="game-ended overlay" v-if="gameEnded">
      <div class="game-ended-message">
        <h4>Game Ended</h4>
        <p>The leader has ended the game.</p>
        <av-button @click="goHome">Ok</av-button>
      </div>
    </div>
    </transition>

    <!-- Menu -->
    <transition name="slide-up-fade">
    <div class="menu overlay" v-if="showMenu">
      <h4>Menu</h4>
      <ul>
        <li v-if="player.leader" @click="endGame">Quit Game</li>
        <li v-if="player.leader && sessionState === 'in_progress'" @click="requestShuffle">Shuffle</li>
        <li>Leave Game</li>
        <li>
          Show Completed Stacks
        </li>
        <li class="close" @click="showMenu = false">Close</li>
      </ul>
    </div>
    </transition>

    <!-- Countdown -->
    <div class="countdown one" v-if="countdown === 1">1</div>
    <div class="countdown two" v-if="countdown === 2">2</div>
    <div class="countdown three" v-if="countdown === 3">3</div>

    <!-- Screen -->
    <transition name="fade-blur">
      <div class="screen" v-if="showScreen">
      </div>
    </transition>

    <!-- Soop Message -->
    <!-- <transition name="fade-blur"> -->
      <div class="soop-message" v-if="showSoopScreen">
        <img src="../assets/soop_large.png"/>
      </div>
    <!-- </transition> -->

    <!-- Waiting -->
    <transition name="slide-up-fade">
      <div v-if="sessionState === 'waiting_for_players'">
        <!-- Game Over -->
        <section class="game-over" v-if="gameOver">
          <div class="modal-header">
            Game Over
          </div>
          <div class="winner">
            {{ gameWinner.name }} WON
          </div>
        </section>

        <!-- Round Info -->
        <section class="round-info" v-if="currentRound !== 0">
          <div class="modal-header">Round {{currentRound}} Results</div>
          <div class="winner">
            {{ lastRoundStats.winner.id === player.id ? 'You' : lastRoundStats.winner.name }} Ended The Round
          </div>
          <div class="stats">
            <div><span>Stack:</span><br>{{ lastRoundStats.stack }}</div>
            <div><span>Cards Played:</span><br>{{ lastRoundStats.cardsPlayed }}</div>
            <div><span>Round Score:</span><br>{{ lastRoundStats.roundScore }}</div>
          </div>
        </section>

        <!-- Leaderboard Modal -->
        <transition name="slide-up-fade">
          <section v-if="channel !== null" class="leaderboard">
            <div class="modal-header">{{ currentRound === 0 ? 'Players Joined' : 'Leaderboard' }}</div>
            <ul class="player-standings">
              <transition-group name="ps">
                <li class="player-standing" v-for="player in players" :key="player.id">
                  <span class="placement" :style="{ background: player.color }">{{ currentRound !== 0 ? player.rank + 1 : '' }}</span>
                  <span class="player-name">{{ player.name }}</span>

                  <span class="player-score" v-if="currentRound >= 1">
                    {{ player.score }}
                    <i v-if="currentRound > 1 && player.delta === 'gt'" class="fas fa-caret-up"></i>
                    <i v-if="currentRound > 1 && player.delta === 'lt'" class="fas fa-caret-down"></i>
                    <i v-if="currentRound > 1 && player.delta === 'eq'" class="fas fa-minus"></i>
                  </span>

                  <span v-if="!gameOver" class="player-status">
                    <spinner v-if="!player.ready"></spinner>
                    <transition name="slide-left">
                      <div v-if="player.ready" class="ready-icon">
                        <i class="fas fa-check"></i>
                      </div>
                    </transition>
                  </span>
                </li>
              </transition-group>
            </ul>
          </section>
        </transition>

        <div class="actions" v-if="!gameOver">
          <av-button @click="markReady" v-if="!player.ready">I'm Ready</av-button>
          <av-button v-if="player.leader && allPlayersReady && player.ready" @click="startRound()">Start Game</av-button>
          <div class="waiting" v-if="!player.leader && player.ready"><spinner></spinner>Waiting For {{ allPlayersReady ? 'Leader' : 'Other Players'}}</div>
        </div>

        <div class="actions" v-if="gameOver">
          <av-button @click="goHome">Take Me Home</av-button>
        </div>
      </div>
    </transition>

    <!-- Game -->
    <section class="soop-board" v-if="sessionState === 'in_progress'">
      <div class="play-area">
        <pile v-for="pile of activePiles" :key="pile.id" :pile="pile"></pile>
      </div>

      <div class="player-dock">
        <!-- Player Stack -->
        <div class="stack">
          <div class="stack-info">Stack: {{ stack.length }}</div>
          <div v-if="!stack[1]" class="win-button placeholder" :class="{active: stack.length === 0}"><i class="fas fa-trophy"></i></div>
          <card v-if="stack[1]" :card="stack[1]" :disableDrag="true" class="next-stack-card"></card>
          <card v-if="stack[0]" @finishedDrag="handleDrop" :card="stack[0]" class="top-stack-card"></card>
        </div>

        <!-- Player Row -->
        <div class="row">
          <div class="row-slot" slot-num="0">
            <div class="row-info">Row 1</div>
            <card v-if="row[0]" @finishedDrag="handleDrop" :card="row[0]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
          <div class="row-slot" slot-num="1">
            <div class="row-info">Row 2</div>
            <card v-if="row[1]" @finishedDrag="handleDrop" :card="row[1]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
          <div class="row-slot" slot-num="2">
            <div class="row-info">Row 3</div>
            <card v-if="row[2]" @finishedDrag="handleDrop" :card="row[2]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
        </div>

        <!-- Player Hand -->
        <div class="hand">
          <div class="hand-info">Hand</div>
          <div class="hand-wrap">
            <card v-if="handPosition != -1" :card="topFlip" @finishedDrag="handleDrop"></card>
            <div class="placeholder" v-if="handPosition == -1"></div>
            <div class="deck" @click="flip"><i class="fas fa-redo"></i></div>
          </div>

          <div class="underneath">
            <card v-if="hand[handPosition - 2]" :card="hand[handPosition - 2]" :disableDrag="true" class="one"></card>
            <card v-if="hand[handPosition - 1]" :card="hand[handPosition - 1]" :disableDrag="true" class="two"></card>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { Player } from '../models/Player'
import { Pile } from '../models/Pile'
import { Card } from '../models/Card'
import { Hand } from '../models/Hand'
import { Channel } from 'phoenix'
import { AxiosError } from 'axios'
import { clone, cloneDeep, shuffle } from 'lodash'

import CardComp from '../components/Card.vue'
import PileComp from '../components/Pile.vue'
import Spinner from '../components/Spinner.vue'

type SessionState = 'in_progress' | 'waiting_for_players' | 'soopMessage'
const gameStateKey = 'gameState'

const comp = Vue.extend({
  name: 'SoupGame',

  data () {
    return {
      channel: null as unknown as Channel,
      countdown: null as number | null,
      currentRound: 1 as number,
      gameOver: false as boolean,
      gameEnded: false as boolean,
      hand: [] as Array<Card>,
      handPosition: -1 as number,
      lastRoundStats: { stack: 0, cardsPlayed: 0, roundScore: 0, winner: null as unknown as Player },
      piles: [] as Array<Pile>,
      player: {} as Player,
      players: [] as Array<Player>,
      row: [] as Array<Card | null>,
      scores: [] as Array<number>,
      sessionId: '' as string | null,
      sessionState: 'waiting' as SessionState,
      showMenu: false,
      showSoopScreen: false,
      stack: [] as Array<Card>,
      totalRounds: 0 as number,
      gameWinner: null as unknown as Player
    }
  },

  mounted () {
    // See if there is a session in local storage
    this.sessionId = localStorage.getItem('soup:sessionId')
    const playerId = localStorage.getItem('soup:playerId')

    if (!this.sessionId || !playerId) {
      this.$router.push('/')
    }

    this.getSession()
  },

  computed: {
    activePiles (): Array<Pile> {
      return this.piles.filter(p => p.currentValue !== 10)
    },

    allPlayersReady (): boolean {
      return this.players.reduce((x: boolean, p: Player) => p.ready && x, true)
    },

    // Determines if the screen should be shown
    showScreen (): boolean {
      return this.showMenu ||
        this.countdown !== null ||
        this.gameEnded ||
        this.showSoopScreen
    },

    stackTop (): Card {
      return this.stack[0]
    },

    topFlip (): Card {
      return this.hand[this.handPosition]
    }
  },

  methods: {
    // Adds a pile to the board
    addPile (pile: Pile) {
      this.piles.push(pile)
    },

    // Adds a player to the list
    addPlayer (player: Player) {
      if (!this.players.find(p => p.id === player.id)) {
        this.players.push(player)
      }
    },

    // Animates a card back to it's original position
    animateBack (elem: HTMLElement) {
      elem.style.transition = 'transform 0.2s ease-in-out'
      elem.style.transform = 'translate(0,0)'
      setTimeout(() => {
        elem.style.transition = 'none'
        elem.classList.remove('dragging')
      }, 201)
    },

    // Decrements the countdown
    dec () {
      (this.countdown as any) -= 1
    },

    // Open websocket connection
    connectToWebsocket () {
      this.$socket.connect()
      // eslint-disable-next-line @typescript-eslint/camelcase
      this.channel = this.$socket.channel(`session:${this.sessionId}`, { player_id: this.player.id })

      // Handle messages
      this.channel.on('player_joined', (p: Player) => this.addPlayer(p))
      this.channel.on('player_ready', (p) => this.setPlayerReady(p.player_id))
      this.channel.on('round_started', (p: Player) => this.roundStarted())
      this.channel.on('new_pile_created', (p: Pile) => this.addPile(p))
      this.channel.on('update_pile', (p: Pile) => this.updatePile(p))
      this.channel.on('end_of_round', msg => this.showEndOfRound(msg.results))
      this.channel.on('game_over', msg => this.showEndOfRound(msg.results, true))
      this.channel.on('game_ended', () => this.showGameEnded())
      this.channel.on('shuffle', () => this.shuffle())

      // Join
      this.channel.join()
        .receive('ok', () => this.notifyPlayers())
    },

    requestShuffle () {
      this.channel.push('request_shuffle', {})
      this.showMenu = false
    },

    showGameEnded () {
      this.gameEnded = true
      localStorage.clear()
    },

    goHome () {
      this.$router.push('/')
    },

    shuffle () {
      this.hand = shuffle(this.hand)
      this.handPosition = -1
      this.saveState()
    },

    endGame () {
      this.channel.push('end_game', {})
    },

    showEndOfRound (results: {winner: string; top_player: string; player_results: Array<any>}, gameover = false) {
      this.currentRound += 1
      this.piles = []

      const roundWinner = this.players.find(p => p.id === results.winner)
      if (roundWinner) {
        this.lastRoundStats.winner = roundWinner
      }

      const playerResults = results.player_results.find(p => p.player_id === this.player.id)
      if (playerResults) {
        this.lastRoundStats.stack = playerResults.stack
        this.lastRoundStats.cardsPlayed = playerResults.cards_played
        this.lastRoundStats.roundScore = playerResults.round_score
      }

      this.showSoopScreen = true

      setTimeout(() => {
        this.showSoopScreen = false

        setTimeout(() => {
          results.player_results.forEach(r => {
            const player = this.players.find(p => p.id === r.player_id)
            if (!player) {
              return
            }

            player.score = r.new_score
            player.rank = r.rank
            player.delta = r.delta
            this.sortPlayers()
          })
        }, 300)

        this.gameOver = gameover

        if (this.gameOver) {
          const gameWinneer = this.players.find(p => p.id === results.top_player)
          if (gameWinneer) {
            this.gameWinner = gameWinneer
          }

          this.sessionState = 'waiting_for_players'
          localStorage.clear()
        } else {
          this.sessionState = 'waiting_for_players'
          this.saveState()
        }
      }, 1000)
    },

    sortPlayers () {
      const copy = clone(this.players).sort((a, b) => {
        if (a.rank < b.rank) {
          return -1
        } else if (b.rank > a.rank) {
          return 1
        } else {
          return 0
        }
      })

      this.players = copy
    },

    // Flips the player's hand
    flip () {
      if (this.handPosition === this.hand.length - 1) {
        this.handPosition = -1
      } else if (this.handPosition + 3 >= this.hand.length) {
        this.handPosition = this.hand.length - 1
      } else {
        this.handPosition += 3
      }
    },

    // Fetch the current session from the server
    getSession () {
      this.$axios.get(`/game/${this.sessionId}`).then(resp => {
        // Copy game information
        this.sessionState = resp.data.game.state
        this.players = resp.data.players
        this.piles = resp.data.piles
        this.currentRound = resp.data.game.current_round
        this.totalRounds = resp.data.game.total_rounds

        // Find current player
        const playerId = localStorage.getItem('soup:playerId')
        const player = this.players.find(p => p.id === playerId)
        if (player) {
          this.player = player
        }

        this.loadState()
        this.connectToWebsocket()
      }).catch((e: AxiosError) => {
        if (e.response && e.response.status === 404) {
          localStorage.clear()
          this.$router.push('/')
        }
      })
    },

    // Handles a card being dropped
    handleDrop ($event: any) {
      const draggedElem = $event.target

      // Get the element that was dropped on
      draggedElem.style.visibility = 'hidden'
      const dropElem = document.elementFromPoint($event.cardCenter.x, $event.cardCenter.y) as HTMLElement
      draggedElem.style.visibility = 'visible'

      if (!dropElem) {
        this.animateBack(draggedElem)
        return
      }

      const dropVue = (dropElem as any).__vue__
      console.log($event)

      if (dropVue && dropVue.$options.name === 'Pile') {
        this.playCardOnPile(draggedElem, dropVue.pile)
      } else if (dropElem.classList.contains('row-slot')) {
        this.playCardOnRow(draggedElem, dropElem)
      } else if ($event.card.value === 1 && (dropElem.classList.contains('play-area') || dropElem.classList.contains('play-area-container'))) {
        this.startNewPile(draggedElem, $event.card as Card)
      } else {
        this.animateBack(draggedElem)
      }

      // this.animateBack(draggedElem)
    },

    playCardOnRow (draggedElem: HTMLElement, dropElem: HTMLElement) {
      const card = (draggedElem as any).__vue__.card
      const slotNum = Number.parseInt(dropElem.getAttribute('slot-num') as string)
      if (this.row[slotNum]) {
        this.animateBack(draggedElem)
      } else {
        if (card.location === 'stack') {
          card.location = 'row'
          this.row.splice(slotNum, 1, card)
          this.stack.splice(0, 1)
          this.snapBack(draggedElem)
          this.channel.push('moved_from_stack', {})
        } else {
          this.animateBack(draggedElem)
        }
      }

      if (this.stack.length === 0) {
        this.soop()
      }

      this.saveState()
    },

    // Load the player's state from local storage
    loadState () {
      const stateString = localStorage.getItem(gameStateKey)
      if (!stateString) return

      const state = JSON.parse(stateString)
      this.lastRoundStats = state.lastRoundStats
      this.setHand(state.hand)
    },

    // Mark status as ready
    markReady () {
      this.channel.push('set_ready', {})
        .receive('ok', hand => this.setHand(hand))
    },

    // Notify other players of joining
    notifyPlayers () {
      this.channel.push('player_joined', { playerId: this.player.id })
    },

    // Handles a card played on a pile
    playCardOnPile (cardElem: HTMLElement, pile: Pile) {
      const card = (cardElem as any).__vue__.card
      this.channel.push('play_card', { card: card, pile_id: pile.id })
        .receive('ok', () => {
          if (card.location === 'stack') {
            this.stack.splice(0, 1)
            this.snapBack(cardElem)
          } else if (card.location === 'row') {
            const currentRowInd = this.row.findIndex(c => c && card.id === c.id)
            this.row.splice(currentRowInd, 1, null)
          } else if (card.location === 'hand') {
            const handInd = this.hand.findIndex(c => c.id === card.id && c.color === card.color)
            this.hand.splice(handInd, 1)
            this.handPosition -= 1
            this.snapBack(cardElem)
          }

          if (this.stack.length === 0) {
            this.soop()
          }

          this.saveState()
        })
        .receive('error', () => {
          this.animateBack(cardElem)
        })
    },

    // Starts the round
    roundStarted () {
      this.player.ready = false
      this.players.forEach(p => { p.ready = false })
      this.sessionState = 'in_progress'
      this.startCountdown()
    },

    // Saves game state to local storage
    saveState () {
      const stateObject = {
        hand: {
          hand: this.hand,
          row: this.row,
          stack: this.stack
        },
        lastRoundStats: this.lastRoundStats,
        gameOver: this.gameOver
      }
      localStorage.setItem(gameStateKey, JSON.stringify(stateObject))
    },

    // saveLastRoundStats () {
    //   localStorage.setItem()
    // }

    // Sets the current player's hand
    setHand (hand: Hand) {
      this.hand = hand.hand
      this.row = hand.row
      this.stack = hand.stack
      this.saveState()
    },

    // Sets the given player's status as ready
    setPlayerReady (playerId: string) {
      const player = this.players.find(p => p.id === playerId)
      if (player) {
        player.ready = true
      }
    },

    snapBack (elem: HTMLElement) {
      elem.style.transform = 'translate(0,0)'
      elem.classList.remove('dragging')
    },

    soop () {
      this.channel.push('soop', {})
    },

    // Starts the countdown to begin a round
    startCountdown (x = 3) {
      this.countdown = x
      setTimeout(() => {
        if (x - 1 > 0) {
          this.startCountdown(x - 1)
        } else {
          this.countdown = null
        }
        console.log(this.countdown)
      }, 1000)
    },

    // Starts a new pile
    startNewPile (cardElem: HTMLElement, card: Card) {
      this.channel.push('new_pile', card)
        .receive('ok', () => {
          this.snapBack(cardElem)
          if (card.location === 'stack') {
            this.stack.splice(0, 1)
          } else if (card.location === 'row') {
            const currentRowInd = this.row.findIndex(c => c && card.id === c.id)
            this.row.splice(currentRowInd, 1, null)
          } else if (card.location === 'hand') {
            const handInd = this.hand.findIndex(c => c.id === card.id && c.color === card.color)
            this.hand.splice(handInd, 1)
            this.handPosition -= 1
          }

          if (this.stack.length === 0) {
            this.soop()
          }

          this.saveState()
        })
    },

    // Starts the next round
    startRound () {
      this.channel.push('start_round', {})
    },

    // Updates a pile with a new value
    updatePile (pile: Pile) {
      const localPile = this.piles.find(p => p.id === pile.id)
      if (localPile) {
        console.log(pile.topPlayerColor)
        localPile.currentValue = pile.currentValue
        localPile.topPlayerColor = pile.topPlayerColor
      }
    }
  },

  components: {
    Spinner,
    card: CardComp,
    pile: PileComp
  }
})

export default comp
</script>
