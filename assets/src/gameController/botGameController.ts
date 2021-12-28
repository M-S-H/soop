// import { Card } from '@/models/Card'
// import { Player } from '@/models/Player'
// import { GameController } from './gameController'
// import { BaseLocalGameController } from './localGameController'

// /**
//  * Game controller for a bot
//  */
// export default class BotGameController extends BaseLocalGameController implements GameController {
//   private params = {
//     waitAvg: 0,
//     waitSd: 0,
//     pileInterval: 0,
//     rowInterval: 0,
//     stackInterval: 0
//   }

//   private intervals = []

//   private timeouts = []

//   constructor (playerId: string, difficulty: number) {
//     super(playerId)
//     // this.difficulty = difficulty
//   }

//   /**
//    * Starts the bot's play
//    */
//   beginPlay (): void {
//     this.tryPlayStack()
//     this.tryPlayRow()
//     this.tryPlayHand()
//   }

//   /**
//    * Stops the bot from playing
//    */
//   stopPlay (): void {
//     // Clear timeouts
//     this.timeouts.forEach(t => clearTimeout(t))
//     this.timeouts = []

//     // Clear intervals
//     this.intervals.forEach(i => clearInterval(i))
//     this.intervals = []
//   }

//   tryPlayStack () {
//     if (this.store.state.sessionState === 'in_progress') {
//       // console.log(`player ${this.playerId}: stack`)
//       this.tryPlayCard(this.store.state.stacks[this.playerId][0])

//       setTimeout(() => {
//         this.tryPlayStack()
//       }, this.waitTime(1000, 6000))
//     }
//   }

//   tryPlayRow () {
//     if (this.store.state.sessionState === 'in_progress') {
//       // console.log(`player ${this.playerId}: stack`)
//       for (const card of this.store.state.rows[this.playerId]) {
//         if (card != null) {
//           this.tryPlayCard(card)
//         }
//       }

//       setTimeout(() => {
//         this.tryPlayRow()
//       }, this.waitTime(500, 3000))
//     }
//   }

//   tryPlayHand () {
//     if (this.store.state.sessionState === 'in_progress') {
//       // console.log(`player ${this.playerId}: stack`)
//       this.flip()
//       const pos = this.store.state.handPositions[this.playerId]
//       const topCard = this.store.state.hands[this.playerId][pos]
//       this.tryPlayCard(topCard)

//       setTimeout(() => {
//         this.tryPlayHand()
//       }, this.waitTime(500, 2000))
//     }
//   }

//   /**
//    * Generates a random number amount of time
//    * @returns A random duration of time in ms
//    */
//   waitTime (min: number, max: number): number {
//     const u1 = Math.random()
//     const u2 = Math.random()

//     const player = this.store.state.players.find(p => p.id === this.playerId) as Player
//     const modifier = player.skillModifier ? player.skillModifier : 0

//     min = 100 + (modifier * 100)
//     max = 300 + (modifier * 300)

//     let z = Math.sqrt(-2 * Math.log2(u1)) * Math.cos(2 * Math.PI * u2)
//     z = z / 10.0 + 0.5

//     if (z > 1 || z < 0) {
//       z = this.waitTime(min, max)
//     } else {
//       z *= (max - min) + min
//     }

//     return z
//   }

//   // MOVE
//   tryPlayCard (card: Card) {
//     if (!card) {
//       return
//     }
//     console.log(`player ${card.player} : ${card.id} : ${card.location}`)
//     if (card.value === 1) {
//       setTimeout(() => {
//         this.startNewPile(card).then(() => {
//           if (this.store.state.stacks[this.playerId].length === 0) {
//             this.soop()
//           }
//         })
//       }, this.waitTime(500, 2000))
//     } else {
//       for (const pile of this.store.state.piles) {
//         if (
//           pile.currentValue === card.value - 1 &&
//           pile.color === card.color
//         ) {
//           setTimeout(() => {
//             this.playCardOnPile(card, pile).then(() => {
//               if (this.store.state.stacks[this.playerId].length === 0) {
//                 this.soop()
//               }
//             })
//           }, this.waitTime(500, 2000))
//           break
//         }
//       }
//     }
//   }
// }
