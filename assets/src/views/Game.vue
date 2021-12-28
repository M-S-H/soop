<template>
  <div class="soop-game">
    <!-- Header -->
    <transition name="slide-down">
      <header v-if="initialized">
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
      <div v-if="sessionState === 'waiting_for_players' && !showSoopScreen">
        <!-- Game Over -->
        <section class="game-over" v-if="gameOver">
          <div class="modal-header">
            Game Over
          </div>
          <div class="winner">
            {{ topPlayer.name }} WON
          </div>
        </section>

        <!-- Round Info -->
        <section class="round-info" v-if="currentRound !== 0">
          <div class="modal-header">Round {{currentRound}} Results</div>
          <div class="winner">
            {{ lastRoundWinner.id === player.id ? 'You' : lastRoundWinner.name }} Ended The Round
          </div>
          <div class="stats">
            <div><span>Stack:</span><br>{{ lastRoundStats.stack }}</div>
            <div><span>Cards Played:</span><br>{{ lastRoundStats.cardsPlayed }}</div>
            <div><span>Round Score:</span><br>{{ lastRoundStats.roundScore }}</div>
          </div>
        </section>

        <!-- Leaderboard Modal -->
        <transition name="slide-up-fade">
          <section v-if="initialized" class="leaderboard">
            <div class="modal-header">{{ currentRound === 0 ? 'Players Joined' : 'Leaderboard' }}</div>
            <ul class="player-standings">
              <transition-group name="ps">
                <li class="player-standing" v-for="player in displayPlayers" :key="player.id">
                  <span class="placement" :style="{ background: player.color }">{{ currentRound !== 0 ? player.rank + 1 : '' }}</span>
                  <span class="player-name">{{ player.name }} || {{ player.skillModifier }}</span>

                  <span class="player-score" v-if="currentRound >= 1">
                    {{ player.score }}
                    <i v-if="currentRound > 1 && player.delta === 'gt'" class="fas fa-caret-up"></i>
                    <i v-if="currentRound > 1 && player.delta === 'lt'" class="fas fa-caret-down"></i>
                    <i v-if="currentRound > 1 && player.delta === 'eq'" class="fas fa-minus"></i>
                  </span>

                  <span v-if="!gameEnded" class="player-status">
                    <spinner v-if="!player.ready"></spinner>
                    <transition name="slide-left">
                      <div v-if="player.ready && gameType === 'Online'" class="ready-icon">
                        <i class="fas fa-check"></i>
                      </div>
                    </transition>
                  </span>
                </li>
              </transition-group>
            </ul>
          </section>
        </transition>

        <transition name="slide-up-fade">
          <div class="actions" v-if="!gameOver && !gameEnded && initialized">
            <av-button @click="markReady" v-if="!player.ready">I'm Ready</av-button>
            <av-button v-if="player.leader && allPlayersReady && player.ready" @click="startRound()">Start Game</av-button>
            <div class="waiting" v-if="!player.leader && player.ready"><spinner></spinner>Waiting For {{ allPlayersReady ? 'Leader' : 'Other Players'}}</div>
          </div>

          <div class="actions" v-if="gameOver">
            <av-button @click="goHome">Take Me Home</av-button>
          </div>
        </transition>
      </div>
    </transition>

    <!-- Game -->
    <section class="soop-board" v-if="sessionState === 'in_progress'">
      <div class="play-area">
        <pile v-for="pile of activePiles" :key="pile.id" :pile="pile"></pile>
      </div>

      <div class="player-dock">
        <!-- Player Stack -->
        <div class="stack" v-if="playerStack">
          <div class="stack-info">Stack: {{ playerStack.length }}</div>
          <div v-if="!playerStack[1]" class="win-button placeholder" :class="{active: playerStack.length === 0}"><i class="fas fa-trophy"></i></div>
          <card v-if="playerStack[1]" :card="playerStack[1]" :disableDrag="true" class="next-stack-card"></card>
          <card v-if="playerStack[0]" @finishedDrag="handleDrop" :card="playerStack[0]" class="top-stack-card"></card>
        </div>

        <!-- Player Row -->
        <div class="row" v-if="playerRow">
          <div class="row-slot" slot-num="0">
            <div class="row-info">Row 1</div>
            <card v-if="playerRow[0]" @finishedDrag="handleDrop" :card="playerRow[0]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
          <div class="row-slot" slot-num="1">
            <div class="row-info">Row 2</div>
            <card v-if="playerRow[1]" @finishedDrag="handleDrop" :card="playerRow[1]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
          <div class="row-slot" slot-num="2">
            <div class="row-info">Row 3</div>
            <card v-if="playerRow[2]" @finishedDrag="handleDrop" :card="playerRow[2]"></card>
            <div class="row-bg">
              <i class="far fa-circle"></i>
            </div>
          </div>
        </div>

        <!-- Player Hand -->
        <div class="hand" v-if="playerHand">
          <div class="hand-info">Hand</div>
          <div class="hand-wrap">
            <card v-if="playerHandPosition != -1" :card="topFlip" @finishedDrag="handleDrop"></card>
            <div class="placeholder" v-if="playerHandPosition == -1"></div>
            <div class="deck" @click="flip"><i class="fas fa-redo"></i></div>
          </div>

          <div class="underneath">
            <card v-if="playerHand[playerHandPosition - 2]" :card="playerHand[playerHandPosition - 2]" :disableDrag="true" class="one"></card>
            <card v-if="playerHand[playerHandPosition - 1]" :card="playerHand[playerHandPosition - 1]" :disableDrag="true" class="two"></card>
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
import { Card, CardDragEvent } from '../models/Card'
import CardComp from '../components/Card.vue'
import PileComp from '../components/Pile.vue'
import Spinner from '../components/Spinner.vue'
import OnlineGameController from '@/gameController/onlineGameController'
import { mapGetters, mapState } from 'vuex'
import { SessionState } from '@/models/SessionState'
import { cloneDeep } from 'lodash'
import { LocalGameController } from '@/gameController/localGameController'

const comp = Vue.extend({
  name: 'SoupGame',

  data () {
    return {
      countdown: null as number | null,
      gameController: null as unknown as LocalGameController | OnlineGameController,
      gameType: 'Online' as 'Online' | 'Local',
      gameWinner: null as unknown as Player,
      initialized: false,
      playerRanks: {} as { [key: string]: number },
      showMenu: false,
      showSoopScreen: false,
      shuffleTimeout: 0
    }
  },

  mounted () {
    // See if there is a session in local storage
    const sessionId = localStorage.getItem('soup:sessionId')
    const playerId = localStorage.getItem('soup:playerId')

    if (!sessionId || !playerId) {
      this.$router.push('/')
    }

    // Initialize game controller
    // this.gameController = new OnlineGameController(sessionId as string, playerId as string)
    this.gameType = 'Local'
    this.gameController = new LocalGameController(playerId as string, 7)
    this.gameController.initialize().then(() => {
      this.updateRankMap()
      this.initialized = true
    }, () => {
      localStorage.clear()
      this.$router.push('/')
    })
  },

  computed: {
    /** List of piles that have not been completted */
    activePiles (): Array<Pile> {
      return this.piles.filter((p: Pile) => p.currentValue !== 10)
    },

    /** List of players to be displayed */
    displayPlayers (): Array<Player> {
      if (this.currentRound === 0) {
        return this.players
      } else {
        return this.sortedPlayers
      }
    },

    /** Determines if the blur screen should be shown */
    showScreen (): boolean {
      return this.showMenu ||
        this.countdown !== null ||
        this.gameEnded ||
        this.showSoopScreen
    },

    /** Players sorted by their rank */
    sortedPlayers (): Array<Player> {
      console.log(this.players)
      return cloneDeep(this.players).sort((a: Player, b: Player) => {
        if (this.playerRanks[a.id] < this.playerRanks[b.id]) {
          return -1
        } else if (this.playerRanks[b.id] > this.playerRanks[a.id]) {
          return 1
        } else {
          return 0
        }
      })
    },

    /** Top flip on hand */
    topFlip (): Card {
      return this.playerHand[this.playerHandPosition]
    },

    /** Map state and getters */
    ...mapState(['sessionId', 'lastRoundStats', 'sessionState', 'gameEnded', 'currentRound', 'players', 'piles', 'gameOver', 'totalCardsPlayed']),
    ...mapGetters(['allPlayersReady', 'lastRoundWinner', 'player', 'playerHand', 'playerHandPosition', 'playerRow', 'playerStack', 'topPlayer'])
  },

  watch: {
    sessionState (newValue: SessionState, oldValue: SessionState) {
      if (oldValue === 'waiting_for_players' && newValue === 'in_progress') {
        this.startCountdown()
      } else if (oldValue === 'in_progress' && newValue === 'waiting_for_players') {
        this.showEndOfRound()
      }
    }

    // totalCardsPlayed () {
    //   clearTimeout(this.shuffleTimeout)
    //   setTimeout(() => {
    //     // this.gameController.attemptShuffle()
    //   }, 10000)
    // }
  },

  methods: {
    /**
     * Animates a card back to it's original position
     */
    animateBack (elem: HTMLElement) {
      elem.style.transition = 'transform 0.2s ease-in-out'
      elem.style.transform = 'translate(0,0)'
      setTimeout(() => {
        elem.style.transition = 'none'
        elem.classList.remove('dragging')
      }, 201)
    },

    /**
     * Decrements the countdown
     */
    dec () {
      (this.countdown as number) -= 1
    },

    /**
     * Ends the game
     */
    endGame () {
      this.gameController.endGame()
    },

    /**
     * Flips the player's hand
     */
    flip () {
      this.gameController.flip()
    },

    /**
     * Returns to the home screen
     */
    goHome () {
      this.$router.push('/')
    },

    /**
     * Handles a card being dropped
     */
    handleDrop ($event: CardDragEvent) {
      const draggedElem = $event.target as HTMLElement
      if (draggedElem == null) return

      // // Get the element that was dropped on
      draggedElem.style.visibility = 'hidden'
      const dropElem = document.elementFromPoint($event.cardCenter.x, $event.cardCenter.y) as HTMLElement
      draggedElem.style.visibility = 'visible'

      if (!dropElem) {
        this.animateBack(draggedElem)
        return
      }

      // Row
      if (dropElem.classList.contains('row-slot')) {
        const rowNum = Number.parseInt(dropElem.getAttribute('slot-num') as string)
        this.gameController.playCardOnRow($event.card, rowNum).then(() => {
          this.snapBack(draggedElem)
        }, (err) => {
          console.log(err)
          this.animateBack(draggedElem)
        })
      // Pile
      } else if (dropElem.classList.contains('pile')) {
        const pileInstance = (dropElem as any).__vue__
        this.gameController.playCardOnPile($event.card, pileInstance.pile).then(() => {
          this.snapBack(draggedElem)
        }, () => {
          this.animateBack(draggedElem)
        })
      // New Pile
      } else if (
        $event.card.value === 1 &&
        (dropElem.classList.contains('play-area') || dropElem.classList.contains('play-area-container'))
      ) {
        this.gameController.startNewPile($event.card).then(() => {
          this.snapBack(draggedElem)
          console.log('snapped back')
        })
      } else {
        this.animateBack(draggedElem)
      }
    },

    /**
     * Sets player's status to ready
     */
    markReady () {
      (this.gameController as OnlineGameController).markReady()
    },

    /**
     * Requests a shuffle
     */
    requestShuffle () {
      console.log('request shuffle')
    },

    /**
     * Shows the round info
     */
    showEndOfRound () {
      this.showSoopScreen = true

      setTimeout(() => {
        this.showSoopScreen = false

        setTimeout(() => {
          this.updateRankMap()
        }, 300)
      }, 1000)
    },

    /**
     * Instantly moves the element back to it's origin
     */
    snapBack (elem: HTMLElement) {
      elem.style.transform = 'translate(0,0)'
      elem.classList.remove('dragging')
    },

    /**
     * Starts the countdown to begin a round
     */
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

    /**
     * Starts the next round
     */
    startRound () {
      console.log(this.$store.state)
      this.gameController.startRound()
    },

    /**
     * Updates the map of players to their rank
     */
    updateRankMap () {
      const newPlayerRansk = {} as { [p: string]: number }
      this.playerRanks = this.players.forEach((p: Player) => {
        newPlayerRansk[p.id] = p.rank
      })

      this.playerRanks = newPlayerRansk
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
