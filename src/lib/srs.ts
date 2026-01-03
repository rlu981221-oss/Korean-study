export interface ReviewItem {
  id: string | number;
  interval: number; // Current interval in days
  repetition: number; // Number of successful reviews in a row
  efactor: number; // Easiness factor
  lastReviewDate: Date; // Date of last review
  dueDate: Date; // Calculated due date
  // 统计字段
  totalReviews: number; // 总复习次数
  correctCount: number; // 正确次数
  wrongCount: number; // 错误次数
  isWeak?: boolean; // 是否为薄弱词汇（可选，用于前端标记）
  isMastered?: boolean; // 是否已掌握（暂停复习）
  isImportant?: boolean; // 是否为重点词汇
}

export enum Rating {
  Again = 1, // Completely forgot (Swipe Down)
  Hard = 2,  // Remembered with difficulty (e.g., hesitated)
  Good = 3,  // Remembered well (Swipe Up)
  Easy = 4   // Remembered perfectly
}

/**
 * Calculates the next review state based on the user's rating.
 * Based on a modified SM-2 algorithm.
 */
export function calculateReview(item: ReviewItem, rating: Rating): ReviewItem {
  let { interval, repetition, efactor } = item;
  const now = new Date();

  // If rating is 'Again' (Forgot), reset cycle
  if (rating === Rating.Again) {
    repetition = 0;
    interval = 1;
  } else {
    // Update Easiness Factor (EF)
    // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // q is quality rating (mapped to 3-5 range for SM-2 math usually, or we use our 1-4)
    // Let's use standard SM-2 quality mapping logic:
    // Rating.Hard (2) -> Quality 3
    // Rating.Good (3) -> Quality 4
    // Rating.Easy (4) -> Quality 5

    let quality = 3;
    if (rating === Rating.Good) quality = 4;
    if (rating === Rating.Easy) quality = 5;

    efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    repetition += 1;

    // Calculate Interval
    if (repetition === 1) {
      interval = 1;
    } else if (repetition === 2) {
      interval = 6;
    } else {
      interval = Math.ceil(interval * efactor);
    }
  }

  // Calculate new due date
  // Using simple new Date().getTime() for stability
  const dueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  // 更新统计数据
  const totalReviews = (item.totalReviews || 0) + 1;
  const correctCount = (item.correctCount || 0) + (rating === Rating.Again ? 0 : 1);
  const wrongCount = (item.wrongCount || 0) + (rating === Rating.Again ? 1 : 0);

  return {
    ...item,
    interval,
    repetition,
    efactor,
    lastReviewDate: now,
    dueDate,
    totalReviews,
    correctCount,
    wrongCount
  };
}

/**
 * Creates an initial state for a new word.
 */
export function getInitialReviewItem(id: string | number): ReviewItem {
  return {
    id,
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    lastReviewDate: new Date(),
    dueDate: new Date(), // Due immediately
    totalReviews: 0,
    correctCount: 0,
    wrongCount: 0
  };
}
