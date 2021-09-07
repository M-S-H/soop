<template>
  <div class="home">
    <div class="home-wrapper">
      <transition name="slide-down-fade">
        <img src="../assets/soop_large.png" class="logo" v-if="active"/>
      </transition>

      <transition name="slide-up-fade">
        <div class="modal" v-if="active">
          <!-- Create/Join Select -->
          <av-button-group v-model="createOrJoin" class="create-or-join" color="light-gray">
            <av-button-group-item value="join">Join Game</av-button-group-item>
            <av-button-group-item value="create">Create Game</av-button-group-item>
          </av-button-group>

          <!-- Create Form -->
          <div class="create-game" v-if="createOrJoin == 'join'">
            <label class="av-label">Game Code</label>
            <input type="text" v-model="joinForm.sessionId" />
            <label class="av-label">Your Name</label>
            <input type="text" v-model="joinForm.name" />
            <label class="av-label">Color</label>
            <div class="color-picker" :style="{background: joinForm.color}" @click="showColorSelection = true"></div>
            <av-button class="submit-button" @click="joinGame" :class="{disabled: !canJoin}">Join!</av-button>
          </div>

          <!-- Join Form -->
          <div class="join-game" v-if="createOrJoin == 'create'">
            <label class="av-label">Number of Rounds</label>
            <div class="rounds-field">
              <i class="fas fa-minus-circle" :class="{disabled: createForm.totalRounds === 1}" @click="decrementRounds()"></i>
              <span>{{ createForm.totalRounds }}</span>
              <i class="fas fa-plus-circle" :class="{disabled: createForm.totalRounds === 10}" @click="incrementRounds()"></i>
            </div>
            <label class="av-label">Your Name</label>
            <input type="text" v-model="createForm.name"/>
            <label class="av-label">Color</label>

            <div class="color-picker" :style="{background: createForm.color}" @click="showColorSelection = true"></div>
            <av-button class="submit-button" @click="createLocalGame" :class="{disabled: !canCreate}">Create!</av-button>
          </div>
        </div>
      </transition>

      <!-- Color Selection -->
      <transition name="slide-up-fade">
        <div class="color-selection" v-if="showColorSelection">
          <div class="color" v-for="color of colors" :key="color" :style="{ background: color}" @click="selectColor(color)"></div>
        </div>
      </transition>

      <transition name="fade">
        <div class="screen" v-if="showColorSelection"></div>
      </transition>

      <!-- Error Messages -->
      <div class="error-message" v-if="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { AxiosError } from 'axios'
import randomColor from 'randomcolor'

export default Vue.extend({
  name: 'Home',

  data () {
    return {
      active: false,
      createOrJoin: 'join' as 'join' | 'create',
      joinForm: { name: '', color: '#CCC', sessionId: '' },
      createForm: { name: '', color: '#CCC', totalRounds: 5 },
      error: null as string | null,
      colors: [] as Array<string>,
      showColorSelection: false
    }
  },

  mounted () {
    // Attempts to get a current game session id from local storage
    const gameId = localStorage.getItem('soup:sessionId')

    // If exists, routes to the game
    if (gameId) {
      this.$router.push('/game')
    }

    this.$store.dispatch('clearState')

    this.active = true

    for (let i = 0; i < 16; i++) {
      this.colors.push(randomColor())
    }
  },

  computed: {
    canJoin (): boolean {
      return this.joinForm.name !== '' &&
        this.joinForm.sessionId.length === 5 &&
        this.joinForm.color !== '#CCC'
    },

    canCreate (): boolean {
      return this.createForm.name !== '' &&
        this.createForm.color !== '#CCC'
    }
  },

  methods: {
    cachePlayerInfo () {
      const formString = JSON.stringify(this.createForm)
      localStorage.setItem('soup:localPlayer', formString)
    },

    // Caches a session and player id after a game is joined or created
    cacheSessionIds (sessionId: string, playerId: string) {
      localStorage.setItem('soup:sessionId', sessionId)
      localStorage.setItem('soup:playerId', playerId)
    },

    /**
     * Creates a local game
     */
    createLocalGame () {
      const sessionId = '10'
      const playerId = '9'
      this.cacheSessionIds(sessionId, playerId)
      this.cachePlayerInfo()
      setTimeout(() => {
        this.$router.push('/game')
      }, 301)
    },

    // Creates a new game session
    createOnlineGame () {
      this.$axios.post('/game', this.createForm).then(resp => {
        this.cacheSessionIds(resp.data.session.id, resp.data.player.id)
        this.active = false
        setTimeout(() => {
          this.$router.push('/game')
        }, 301)
      }).catch((err: AxiosError) => {
        console.log(err)
      })
    },

    decrementRounds () {
      if (this.createForm.totalRounds > 1) {
        this.createForm.totalRounds -= 1
      }
    },

    // Increases the total number of roudns
    incrementRounds () {
      if (this.createForm.totalRounds < 10) {
        this.createForm.totalRounds += 1
      }
    },

    // Joins a current game session
    joinGame () {
      this.$axios.put('/join_game', this.joinForm).then(resp => {
        this.cacheSessionIds(resp.data.session.id, resp.data.player.id)
        this.$router.push('/game')
      }).catch((e: AxiosError) => {
        this.error = e.response?.data
        setTimeout(() => {
          this.error = null
        }, 5000)
      })
    },

    selectColor (color: string) {
      this.joinForm.color = color
      this.createForm.color = color
      this.showColorSelection = false
    }
  }
})
</script>
