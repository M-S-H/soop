export interface Player {
  id: string;
  name: string;
  color: string;
  delta: string;
  score: number;
  leader: boolean;
  rank: number;
  ready: boolean;
  stack: number;
  cards_played: number;
  skillModifier?: number;
}

// id: "P:" <> IdGen.generate_id(),
// name: name,
// color: color,
// score: 0,
// leader: leader,
// ready: false,
// stack: 0,
// cards_played: 0
