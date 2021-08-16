export interface PlayerResult {
  playerId: string;
  newScore: number;
  rank: number;
  delta: number;
  stack: number;
  cardsPlayed: number;
  roundScore: number;
}

export interface RoundResults {
  roundWinner: string;
  topPlayer: string;
  playerResults: Array<PlayerResult>;
}
