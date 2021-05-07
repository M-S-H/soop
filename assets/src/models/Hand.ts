import { Card } from './Card'

export interface Hand
{
  hand: Array<Card>;
  stack: Array<Card>;
  row: Array<Card>;
}
