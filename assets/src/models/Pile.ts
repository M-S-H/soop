import { Card } from './Card'

export interface Pile {
  id: string;
  color: string;
  currentValue: number;
  cards: Array<Card>;
  topPlayerColor: string;
}
