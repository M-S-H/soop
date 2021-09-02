import { Card } from '@/models/Card'
import { Pile } from '@/models/Pile'
import { State } from '@/store/state'
import store from '@/store/store'
import { Store } from 'vuex'

export type PlayResponse = 'ok' | 'error'

export interface GameController {
  endGame (): void;

  flip (): void;

  initialize(): Promise<boolean>;

  markReady(): void;

  playCardOnPile(card: Card, pile: Pile): Promise<void>;

  playCardOnRow(card: Card, rowNum: number): Promise<void>;

  startNewPile(card: Card): Promise<void>;

  startRound(): void;
}

export abstract class BaseGameController implements GameController {
  /** The current player's id */
  protected playerId: string

  /** The application state */
  protected store: Store<State>

  constructor (playerId: string) {
    this.playerId = playerId
    this.store = store
  }

  abstract endGame (): void

  /**
   * Flips the current plauyer's hand
   */
  flip () {
    this.store.dispatch('flip', this.playerId)
  }

  abstract initialize (): Promise<boolean>

  abstract markReady (): void

  abstract playCardOnPile (card: Card, pile: Pile): Promise<void>

  abstract playCardOnRow (card: Card, rowNum: number): Promise<void>

  abstract startNewPile (card: Card): Promise<void>

  abstract startRound (): void
}
