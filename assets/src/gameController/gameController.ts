import { Card } from '@/models/Card'
import { Pile } from '@/models/Pile'
import { Player } from '@/models/Player'

export type PlayResponse = 'ok' | 'error'

export interface GameController {
  endGame(): void;

  initialize(): Promise<boolean>;

  markReady(): void;

  flip (): void;

  playCardOnPile(card: Card, pile: Pile): Promise<void>;

  playCardOnRow(card: Card, rowNum: number): Promise<void>;

  startNewPile(card: Card): Promise<void>;

  startRound(): void;
}
