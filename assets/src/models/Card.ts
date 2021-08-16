import 'hammerjs'

export interface Card {
  id: string;
  value: number;
  color: string;
  player: string;
  location: CardPosition;
  player_color: string;
}

export interface CardDragEvent extends HammerInput {
  card: Card;
  cardCenter: { x: number; y: number };
}

export type CardPosition = 'hand' | 'row' | 'stack';
