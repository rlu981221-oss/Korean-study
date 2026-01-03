
import { calculateReview, getInitialReviewItem, Rating } from './srs';

function runTest(name: string, assertion: () => boolean) {
    if (assertion()) {
        console.log(`✅ [PASS] ${name}`);
    } else {
        console.error(`❌ [FAIL] ${name}`);
    }
}

console.log('--- Starting SRS Algorithm Tests ---');

// Test 1: Initial Item State
const item1 = getInitialReviewItem(1);
runTest('Initial Item State', () => {
    return item1.interval === 0 && item1.repetition === 0 && item1.efactor === 2.5;
});

// Test 2: First successful review (Good)
const item2 = calculateReview(item1, Rating.Good);
runTest('First Review (Good) -> Interval 1', () => {
    return item2.interval === 1 && item2.repetition === 1 && item2.efactor > 2.5;
});

// Test 3: Second successful review (Good)
const item3 = calculateReview(item2, Rating.Good);
runTest('Second Review (Good) -> Interval 6', () => {
    return item3.interval === 6 && item3.repetition === 2;
});

// Test 4: Third successful review (Easy)
const item4 = calculateReview(item3, Rating.Easy);
runTest('Third Review (Easy) -> Interval > 6', () => {
    // EF increased, interval = 6 * EF
    return item4.interval > 6 && item4.repetition === 3 && item4.efactor > item3.efactor;
});

// Test 5: Forgetting (Again)
const item5 = calculateReview(item4, Rating.Again);
runTest('Forgetting (Again) -> Reset', () => {
    return item5.interval === 1 && item5.repetition === 0; // Reset to 0 per our logic? Wait, code says repetition = 0
});

console.log('--- Tests Completed ---');
