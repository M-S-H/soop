import { Card } from '@/models/Card'
import { Pile } from '@/models/Pile'
import { Player } from '@/models/Player'
import { SessionState } from '@/models/SessionState'

export interface State {
  currentRound: number;
  gameEnded: boolean;
  gameOver: boolean;
  hands: { [id: string]: Array<Card> };
  handPositions: { [id: string]: number };
  lastRoundStats: {
    score: number;
    cardsPlayed: number;
    roundScore: number;
    roundWinner: string;
  };
  piles: Array<Pile>;
  playerId: string;
  players: Array<Player>;
  rows: { [id: string]: Array<Card> };
  sessionId: string;
  sessionState: SessionState;
  stacks: { [id: string]: Array<Card> };
  totalCardsPlayed: number;
  topPlayerId: string;
  totalRounds: number;
}
