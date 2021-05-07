<template>
  <div
    class="card"
    :class=[card.color]
  >
    {{ card ? card.value : ''}}</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import Hammer from 'hammerjs'
import { Card } from '../models/Card'

export default (Vue.extend({
  name: 'Card',

  props: {
    card: {
      type: Object as PropType<Card>
    },

    disableDrag: {
      type: Boolean,
      default: false
    }
  },

  mounted () {
    if (!this.disableDrag) {
      const hammer = new Hammer(this.$el as HTMLElement)

      hammer.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }))

      hammer.on('pan', (ev) => {
        this.removeHighlights()

        const elem = ev.target as HTMLElement
        elem.style.transform = `translate(${ev.deltaX}px, ${ev.deltaY}px) scale(1.1, 1.1)`
        elem.classList.add('dragging')

        // Determine the dragged card's center
        const cardCenter = { x: 0, y: 0 }
        const rect = elem.getBoundingClientRect()
        cardCenter.x = rect.x + rect.width / 2
        cardCenter.y = rect.y + rect.height / 2

        this.addHightlights(cardCenter.x, cardCenter.y)

        if (ev.isFinal) {
          this.removeHighlights();

          (ev as any).card = this.card;
          (ev as any).cardCenter = cardCenter
          this.$emit('finishedDrag', ev)
        }
      })
    }
  },

  methods: {
    addHightlights (x: number, y: number) {
      const els = document.elementsFromPoint(x, y)
      const pile = els.find(e => e.classList.contains('pile'))
      const playArea = els.find(e => e.classList.contains('play-area'))
      const rowSlot = els.find(e => e.classList.contains('row-slot'))

      if (this.card.value === 1 && playArea && !pile) {
        playArea.classList.add('hover-highlight')
        return
      }

      if (this.card.location === 'stack' && rowSlot && rowSlot.children.length === 2) {
        rowSlot.classList.add('hover-highlight')
        return
      }

      if (pile) {
        const pileVue = (pile as any).__vue__
        if (pileVue.pile.color === this.card.color && pileVue.pile.currentValue === this.card.value - 1) {
          pile.classList.add('hover-highlight')
        }
      }
    },

    removeHighlights () {
      const oldHilights = document.querySelectorAll('.hover-highlight')
      oldHilights.forEach(element => {
        element.classList.remove('hover-highlight')
      })
    }
  }
}))
</script>
