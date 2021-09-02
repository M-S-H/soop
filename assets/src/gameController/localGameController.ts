import { Card } from '@/models/Card'
import { Pile } from '@/models/Pile'
import { State } from '@/store/state'
import store from '@/store/store'
import { Store } from 'vuex'
import { BaseGameController, GameController } from './gameController'

/**
 * Game controller that conducts a local game with bots
 */
export default class LocalGameController extends BaseGameController implements GameController {
  /** The number of bots to create */
  private botNum: number;

  constructor (playerId: string, botNum: number) {
    super(playerId)
    this.botNum = botNum
  }

  endGame (): void {
    throw new Error('Method not implemented.')
  }

  initialize (): Promise<boolean> {
    throw new Error('Method not implemented.')
  }

  markReady (): void {
    throw new Error('Method not implemented.')
  }

  playCardOnPile (card: Card, pile: Pile): Promise<void> {
    throw new Error('Method not implemented.')
  }

  playCardOnRow (card: Card, rowNum: number): Promise<void> {
    throw new Error('Method not implemented.')
  }

  startNewPile (card: Card): Promise<void> {
    throw new Error('Method not implemented.')
  }

  startRound (): void {
    throw new Error('Method not implemented.')
  }
}
