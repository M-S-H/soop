<template>
  <div class="pile" :class="[pile.color]">
    {{ pile.currentValue }}
     <div class="player-indicator" :style="{'border-top-color': pile.topPlayerColor}"></div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  name: 'Pile',

  props: ['pile'],

  watch: {
    'pile.currentValue': function () {
      this.animateDrop()
    }
  },

  mounted () {
    this.animateDrop()
  },

  methods: {
    animateDrop () {
      this.$el.classList.add('pile-update')
      setTimeout(() => {
        this.$el.classList.remove('pile-update')
      }, 301)
    }
  }
})
</script>
