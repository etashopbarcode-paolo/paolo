export type PlayerColor = 'white' | 'black';

export enum MatchResult {
  WIN = 'WIN',     // User won
  LOSS = 'LOSS',   // User lost
  DRAW = 'DRAW',   // Draw
  PENDING = 'PENDING' // Match created but not finished
}

export interface Match {
  id: string;
  opponentName: string;
  userColor: PlayerColor;
  result: MatchResult;
  timestamp: number;
}

export interface OpponentStats {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  totalPoints: number;     // User points
  opponentPoints: number;  // Opponent points
  gamesPlayed: number;
}