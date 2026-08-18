const DEFAULT_GREEN = 75;
const DEFAULT_YELLOW = 50;
const DEFAULT_RED = 0;

export const SCORE_THRESHOLD_GREEN = Number(import.meta.env.VITE_SCORE_THRESHOLD_GREEN) || DEFAULT_GREEN;
export const SCORE_THRESHOLD_YELLOW = Number(import.meta.env.VITE_SCORE_THRESHOLD_YELLOW) || DEFAULT_YELLOW;
export const SCORE_THRESHOLD_RED = Number(import.meta.env.VITE_SCORE_THRESHOLD_RED) || DEFAULT_RED;

export const getScoreColor = (score) => {
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numericScore)) return 'var(--text-muted)';
  
  if (numericScore >= SCORE_THRESHOLD_GREEN) return 'var(--success)';
  if (numericScore >= SCORE_THRESHOLD_YELLOW) return 'var(--warning)';
  return 'var(--danger)';
};

export const getScoreBadgeClass = (score) => {
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numericScore)) return 'grade-muted';
  
  if (numericScore >= SCORE_THRESHOLD_GREEN) return 'grade-success';
  if (numericScore >= SCORE_THRESHOLD_YELLOW) return 'grade-warning';
  return 'grade-danger';
};

export const getScoreGradeText = (score) => {
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numericScore)) return 'N/A';
  
  if (numericScore >= SCORE_THRESHOLD_GREEN) return 'Grade A (Excellent)';
  if (numericScore >= SCORE_THRESHOLD_YELLOW) return 'Grade B (Meeting Standards)';
  return 'Grade C (Needs Training)';
};
