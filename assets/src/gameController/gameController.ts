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

  playCardOnPile(card: Card, pile: Pile): Promise<void>;

  playCardOnRow(card: Card, rowNum: number): Promise<void>;

  startNewPile(card: Card): Promise<void>;

  startRound(): void;
}
