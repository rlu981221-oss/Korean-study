import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReviewItem } from './srs';

const STORAGE_KEY = 'nora_korean_progress';

export type ProgressMap = Record<string | number, ReviewItem>;

/**
 * Loads the saved progress from AsyncStorage.
 * Returns a map of word ID to ReviewItem.
 */
export async function loadProgress(): Promise<ProgressMap> {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
            const parsed = JSON.parse(jsonValue);
            // Restore Date objects from strings
            for (const key in parsed) {
                parsed[key].lastReviewDate = new Date(parsed[key].lastReviewDate);
                parsed[key].dueDate = new Date(parsed[key].dueDate);
                // 确保统计字段存在（向后兼容）
                parsed[key].totalReviews = parsed[key].totalReviews || 0;
                parsed[key].correctCount = parsed[key].correctCount || 0;
                parsed[key].wrongCount = parsed[key].wrongCount || 0;
            }
            return parsed;
        }
        return {};
    } catch (e) {
        console.error('Failed to load progress', e);
        return {};
    }
}

/**
 * Saves the current progress map to AsyncStorage.
 */
export async function saveProgress(progress: ProgressMap): Promise<void> {
    try {
        const jsonValue = JSON.stringify(progress);
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error('Failed to save progress', e);
    }
}

// 用户统计数据
const STATS_KEY = 'nora_korean_user_stats';

export interface UserStats {
    streak: number;           // 连续学习天数
    lastStudyDate: string;    // 最后学习日期 (YYYY-MM-DD)
    totalReviews: number;     // 累计复习次数
    dailyNewWordGoal: number; // 每日新词目标
    history: Record<string, number>; // 历史记录: { '2023-10-27': 15 }
}

/**
 * 加载用户统计数据
 */
export async function loadUserStats(): Promise<UserStats> {
    try {
        const jsonValue = await AsyncStorage.getItem(STATS_KEY);
        if (jsonValue != null) {
            const stats = JSON.parse(jsonValue);
            return {
                streak: stats.streak || 0,
                lastStudyDate: stats.lastStudyDate || '',
                totalReviews: stats.totalReviews || 0,
                dailyNewWordGoal: stats.dailyNewWordGoal || 5,
                history: stats.history || {}
            };
        }
        // 默认值
        return {
            streak: 0,
            lastStudyDate: '',
            totalReviews: 0,
            dailyNewWordGoal: 5,
            history: {}
        };
    } catch (e) {
        console.error('Failed to load user stats', e);
        return {
            streak: 0,
            lastStudyDate: '',
            totalReviews: 0,
            dailyNewWordGoal: 5,
            history: {}
        };
    }
}

/**
 * 保存用户统计数据
 */
export async function saveUserStats(stats: UserStats): Promise<void> {
    try {
        const jsonValue = JSON.stringify(stats);
        await AsyncStorage.setItem(STATS_KEY, jsonValue);
    } catch (e) {
        console.error('Failed to save user stats', e);
    }
}

// 自定义词库存储
const CUSTOM_WORDS_KEY = 'nora_korean_custom_words';

export interface CustomWord {
    id: number;
    hangul: string;
    cn: string;
    category: string;
}

export async function loadCustomWords(): Promise<CustomWord[]> {
    try {
        const jsonValue = await AsyncStorage.getItem(CUSTOM_WORDS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load custom words', e);
        return [];
    }
}

export async function saveCustomWords(words: CustomWord[]): Promise<void> {
    try {
        await AsyncStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
    } catch (e) {
        console.error('Failed to save custom words', e);
    }
}
