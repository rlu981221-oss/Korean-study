import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { calculateReview, getInitialReviewItem, Rating, ReviewItem } from '../src/lib/srs';
import { loadUserStats, saveUserStats } from '../src/lib/storage';

export interface DBWord {
    id: number;
    word: string;
    level: string | number;
    breakdown: string;
    cn: string;
    hanja: string | null;
    phrase1: string | null;
    phrase1_cn: string | null;
    phrase2: string | null;
    phrase2_cn: string | null;
    ai_mnemonic: string | null;
    ai_usage: string | null;
    ai_tips: string | null;
    category: string | null; // 新增：主题分类
    pos: string | null;      // 新增：词性
    ai_sentences: string | null;
    ai_meaning: string | null;
}

export interface WordWithSRS extends DBWord {
    reviewItem: ReviewItem;
    isImportant?: boolean;
    // UI Compatibility fields
    sentences: string[];
    translation: string;
    hanja_logic?: string;
    ai_explanation?: string;
    ai_meaning: string | null;
}

interface WordContextType {
    words: WordWithSRS[];
    sessionQueue: WordWithSRS[];
    isSessionComplete: boolean;
    isLoading: boolean;
    updateReview: (wordId: number, rating: Rating) => Promise<void>;
    toggleWordMark: (wordId: number) => void;
    saveAIAnalysis: (wordId: number, analysis: any) => Promise<void>;
    refreshSession: () => void;
    dailyNewTarget: number;
    updateDailyNewTarget: (n: number) => Promise<void>;
    addCustomWord: (word: string, translation: string, level: string | number) => Promise<void>;
    resetAllData: () => Promise<void>;
    repairDatabase: () => Promise<void>;
    addExtraWordsToday: (count: number) => void;
    fetchRemoteLibrary: (url: string) => Promise<number>;
    exportBackup: () => Promise<void>;
    importData: () => Promise<void>;
}

const WordContext = createContext<WordContextType | undefined>(undefined);

const WORDS_PER_SESSION = 50;

export function WordProvider({ children }: { children: React.ReactNode }) {
    const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
    const [words, setWords] = useState<WordWithSRS[]>([]);
    const [sessionQueue, setSessionQueue] = useState<WordWithSRS[]>([]);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dailyNewTarget, setDailyNewTarget] = useState(30);
    const [extraNewWordsToday, setExtraNewWordsToday] = useState(0);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await AsyncStorage.getItem('DAILY_NEW_TARGET');
            if (saved) setDailyNewTarget(parseInt(saved));
        };
        loadSettings();
        initDatabase();
    }, []);

    const updateDailyNewTarget = async (n: number) => {
        setDailyNewTarget(n);
        await AsyncStorage.setItem('DAILY_NEW_TARGET', n.toString());
        // 刷新当前 Session，直接传递最新数值 n
        if (words.length > 0) generateSession(words, n);
    };

    // useEffect(() => {
    //     if (words.length > 0) {
    //         generateSession(words);
    //     }
    // }, [words]);

    const initDatabase = async () => {
        setIsLoading(true);
        try {
            console.log('[WordContext] Initializing database...');

            console.log('[WordContext] Initializing database...');

            // 升级：切换到 V2 版本，强制打破旧缓存
            const dbName = 'vocabulary_v2.db';
            const docDir = (FileSystem as any).documentDirectory;
            let dbPath = dbName; // Default to just dbName for fallback
            let dbDir = '';

            if (docDir) {
                dbDir = docDir + 'SQLite/';
                dbPath = dbDir + dbName;

                // 1. 确保 SQLite 目录存在 (Android 需要)
                const dirInfo = await (FileSystem as any).getInfoAsync(dbDir);
                if (!dirInfo.exists) {
                    await (FileSystem as any).makeDirectoryAsync(dbDir, { intermediates: true });
                }
            } else {
                console.log('[WordContext] Fallback mode: docDir is null.');
                // 即使 docDir 为空，我们也应该尝试打开数据库（Expo 可能会处理）
                // 但此时 dbPath 是无效的，所以只能依赖 SQLite.openDatabaseAsync 的默认行为
            }

            // 2. 检查本地数据库是否存在及版本
            let shouldCopy = false;
            if (docDir) {
                const fileInfo = await (FileSystem as any).getInfoAsync(dbPath);
                shouldCopy = !fileInfo.exists;
            }

            if (shouldCopy) {
                console.log('[WordContext] 正在安装最新词库资产 (V2)...');
                const { Asset } = require('expo-asset');
                const asset = Asset.fromModule(require('../assets/vocabulary_v2.db'));
                await asset.downloadAsync();

                if (asset.localUri) {
                    await (FileSystem as any).copyAsync({
                        from: asset.localUri,
                        to: dbPath
                    });
                    console.log('[WordContext] 词库安装/更新成功！');
                }
            }

            // 3. 打开数据库（尝试首次打开）
            let database;
            try {
                database = await SQLite.openDatabaseAsync(dbName);
                // 立即验证表是否存在
                await database.execAsync("SELECT count(*) FROM vocabulary LIMIT 1");

            } catch (e: any) {
                console.log('[WordContext] 数据库文件损坏或表丢失，尝试终极修复...', e);

                if (database) await database.closeAsync();

                // 如果打开失败，强制删除文件并重试拷贝
                if (dbPath && docDir) {
                    try {
                        console.log('[WordContext] Deleting corrupted DB at:', dbPath);
                        await (FileSystem as any).deleteAsync(dbPath, { idempotent: true });

                        console.log('[WordContext] Re-downloading asset...');
                        const { Asset } = require('expo-asset');
                        const asset = Asset.fromModule(require('../assets/vocabulary_v2.db'));
                        await asset.downloadAsync();

                        if (asset.localUri) {
                            console.log('[WordContext] Copying fresh asset from:', asset.localUri);
                            await (FileSystem as any).copyAsync({
                                from: asset.localUri,
                                to: dbPath
                            });
                        } else {
                            throw new Error("Asset download failed, no localUri");
                        }

                        // 再次尝试打开
                        console.log('[WordContext] Re-opening database...');
                        database = await SQLite.openDatabaseAsync(dbName);
                    } catch (repairError) {
                        console.error('[WordContext] Repair failed:', repairError);
                        throw repairError;
                    }
                } else {
                    console.log('[WordContext] FileSystem repair unavailable (docDir is null). Switching to "Seeding Mode"...');

                    // 确保 database 对象存在
                    if (!database) {
                        // 如果之前 close 了，或者根本没 open 成功，重新 open 一个新的
                        database = await SQLite.openDatabaseAsync(dbName);
                    } else {
                        // 为了保险，先 close 再 open，防止 zombie 状态
                        try { await database.closeAsync(); } catch (e) { }
                        database = await SQLite.openDatabaseAsync(dbName);
                    }

                    // 方案 B: 无法拷贝文件，只能原地建表并灌入数据
                    // 确保 WAL 模式开启
                    await database.execAsync('PRAGMA journal_mode = WAL;');

                    // 1. 建表
                    await database.execAsync(`
                        CREATE TABLE IF NOT EXISTS vocabulary (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            word TEXT NOT NULL,
                            level TEXT,
                            breakdown TEXT,
                            cn TEXT,
                            hanja TEXT,
                            phrase1 TEXT,
                            phrase1_cn TEXT,
                            phrase2 TEXT,
                            phrase2_cn TEXT,
                            ai_mnemonic TEXT,
                            ai_usage TEXT,
                            ai_tips TEXT,
                            category TEXT,
                            pos TEXT, 
                            ai_sentences TEXT,
                            ai_meaning TEXT
                        );
                        CREATE TABLE IF NOT EXISTS progress (
                            word_id INTEGER PRIMARY KEY,
                            interval INTEGER DEFAULT 0,
                            repetition INTEGER DEFAULT 0,
                            efactor REAL DEFAULT 2.5,
                            last_review_date TEXT,
                            due_date TEXT,
                            first_review_date TEXT,
                            total_reviews INTEGER DEFAULT 0,
                            correct_count INTEGER DEFAULT 0,
                            wrong_count INTEGER DEFAULT 0
                        );
                    `);

                    // 2. 灌数据 (从 JSON)
                    console.log('[WordContext] Seeding data from JSON...');
                    const rawData = require('../topik_vocab.json');

                    // 批量插入优化
                    await database.runAsync('BEGIN TRANSACTION');
                    for (const item of rawData) {
                        await database.runAsync(
                            `INSERT INTO vocabulary (word, level, cn) VALUES (?, ?, ?)`,
                            [item.word, item.level, item.translation || '']
                        );
                    }
                    await database.runAsync('COMMIT');
                    console.log(`[WordContext] Seeded ${rawData.length} words successfully.`);
                }
            }

            // 确保 database 此时是可用的，然后继续后面的逻辑

            // 数据库对象已经在上面被初始化了

            // 4. 强力补丁：即便在 Fallback 模式下，也现场补齐缺失字段
            if (!database) {
                throw new Error("Failed to initialize database object");
            }

            // 4. Schema 补丁
            try {
                await database.execAsync("ALTER TABLE vocabulary ADD COLUMN ai_tips TEXT");
                console.log("[WordContext] Migrated: Added ai_tips");
            } catch (e) { }

            try {
                await database.execAsync("ALTER TABLE vocabulary ADD COLUMN ai_mnemonic TEXT");
                console.log("[WordContext] Added ai_mnemonic");
            } catch (e) { }

            try {
                await database.execAsync("ALTER TABLE vocabulary ADD COLUMN ai_usage TEXT");
                console.log("[WordContext] Added ai_usage");
            } catch (e) { }

            try {
                await database.execAsync("ALTER TABLE vocabulary ADD COLUMN ai_sentences TEXT");
                console.log("[WordContext] Added ai_sentences");
            } catch (e) { }

            try {
                await database.execAsync("ALTER TABLE vocabulary ADD COLUMN ai_meaning TEXT");
                console.log("[WordContext] Added ai_meaning");
            } catch (e) { }

            try {
                await database.execAsync(`
                    CREATE TABLE IF NOT EXISTS progress (
                        word_id INTEGER PRIMARY KEY,
                        interval INTEGER DEFAULT 0,
                        repetition INTEGER DEFAULT 0,
                        efactor REAL DEFAULT 2.5,
                        last_review_date TEXT,
                        due_date TEXT,
                        first_review_date TEXT,
                        total_reviews INTEGER DEFAULT 0,
                        correct_count INTEGER DEFAULT 0,
                        wrong_count INTEGER DEFAULT 0
                    )
                `);

                // 迁移：为旧数据库添加 first_review_date
                try {
                    await database.execAsync("ALTER TABLE progress ADD COLUMN first_review_date TEXT");
                } catch (e) { }
            } catch (e) { }

            setDb(database);
            await loadWords(database);
        } catch (error) {
            console.error('[WordContext] Database init error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadWords = async (database: SQLite.SQLiteDatabase) => {
        console.log('[WordContext] Loading all words from DB...');
        const rows = await database.getAllAsync<DBWord>('SELECT * FROM vocabulary');
        console.log('[WordContext] Loaded total', rows.length, 'raw entries');

        // 去重与合并逻辑
        const mergedWordsMap = new Map<string, WordWithSRS>();

        rows.forEach(row => {
            let aiSentences: string[] = [];
            try {
                if (row.ai_sentences) {
                    aiSentences = JSON.parse(row.ai_sentences);
                }
            } catch (e) {
                console.error("Failed to parse ai_sentences", e);
            }

            const sentences = aiSentences.length > 0
                ? aiSentences
                : [row.phrase1, row.phrase2].filter(s => s) as string[];

            const convertedWord: WordWithSRS = {
                ...row,
                reviewItem: getInitialReviewItem(row.id),
                isImportant: false,
                sentences: sentences,
                translation: row.cn,
                hanja_logic: row.ai_tips || undefined,
                ai_meaning: row.ai_meaning || null,
                level: row.level
            };

            if (mergedWordsMap.has(row.word)) {
                // 如果已存在（重复词），进行合并
                const existing = mergedWordsMap.get(row.word)!;

                // 1. 合并等级 (例如 B + C => B/C)
                // 1. 合并等级 (例如 B + C => B/C)
                const existingLevelStr = String(existing.level);
                const newLevelStr = String(row.level);

                if (existing.level !== row.level && !existingLevelStr.includes(newLevelStr)) {
                    // 简单的去重合并逻辑，避免 "B/C/B"
                    const levels = new Set([existingLevelStr, newLevelStr]);
                    // 如果一个是数字一个是字符，可能需要特殊处理，这里暂且直接拼接
                    existing.level = Array.from(levels).join('/');
                }

                // 2. 如果新记录有更详细的 AI 数据，覆盖旧的
                if (!existing.ai_meaning && row.ai_meaning) existing.ai_meaning = row.ai_meaning;
                if (!existing.ai_tips && row.ai_tips) existing.ai_tips = row.ai_tips;

                // 3. 合并例句 (去重)
                const newSentences = [...existing.sentences, ...sentences];
                existing.sentences = Array.from(new Set(newSentences)).slice(0, 3); // 限制最多3句

            } else {
                mergedWordsMap.set(row.word, convertedWord);
            }
        });

        const allWords = Array.from(mergedWordsMap.values());
        console.log('[WordContext] After merging duplicates:', allWords.length, 'unique words');

        const progressData = await database.getAllAsync<any>(
            'SELECT * FROM progress'
        );

        console.log('[WordContext] Loaded', progressData.length, 'progress records');

        progressData.forEach((p: any) => {
            const idx = allWords.findIndex(w => w.id === p.word_id);
            if (idx !== -1) {
                allWords[idx].reviewItem = {
                    id: p.word_id,
                    interval: p.interval,
                    repetition: p.repetition,
                    efactor: p.efactor,
                    lastReviewDate: new Date(p.last_review_date),
                    dueDate: new Date(p.due_date),
                    totalReviews: p.total_reviews || 0,
                    correctCount: p.correct_count || 0,
                    wrongCount: p.wrong_count || 0
                };
                // 暂时保存在扩展属性里，用于 generateSession 统计
                (allWords[idx] as any).firstReviewDate = p.first_review_date;
            }
        });

        setWords(allWords);
        console.log('[WordContext] Words loaded into state!');

        // 确保读取到用户设置后再生成
        const savedTarget = await AsyncStorage.getItem('DAILY_NEW_TARGET');
        const targetToUse = savedTarget ? parseInt(savedTarget) : dailyNewTarget;
        if (savedTarget) setDailyNewTarget(parseInt(savedTarget));

        // 生成初始 Session
        generateSession(allWords, targetToUse);
    };

    const generateSession = (currentWords: WordWithSRS[], overrideBaseTarget?: number, overrideExtra?: number) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const base = overrideBaseTarget ?? dailyNewTarget;
        const extra = overrideExtra ?? extraNewWordsToday;
        const targetCount = base + extra;

        // 1. 统计今天已经新学了多少词（首次学习日期是今天的词）
        // 如果 WordWithSRS 里能带上首次学习日期最好，或者直接查 words 状态
        // 这里的逻辑：在 words 中寻找 progress 记录里的 first_review_date 为今天的
        const learnedTodayCount = currentWords.filter(w => {
            const firstDate = (w as any).firstReviewDate;
            return firstDate && firstDate.startsWith(todayStr);
        }).length;

        const remainingNewQuota = Math.max(0, targetCount - learnedTodayCount);

        // 2. 到期复习的单词 (已复习过且到期)
        const dueWords = currentWords.filter(w =>
            !w.reviewItem.isMastered && w.reviewItem.repetition > 0 && w.reviewItem.dueDate <= now
        );

        // 3. 补抓新单词 (直到达到今日配额)
        const newWordsFiltered = currentWords.filter(w =>
            !w.reviewItem.isMastered && w.reviewItem.repetition === 0
        );

        const newWords = newWordsFiltered.slice(0, remainingNewQuota);

        const queue = [...dueWords, ...newWords];
        console.log('[WordContext] Session generated:',
            `Queue: ${queue.length}`,
            `(Learned Today: ${learnedTodayCount},`,
            `Quota Left: ${remainingNewQuota},`,
            `Extra: ${extraNewWordsToday},`,
            `Due: ${dueWords.length})`
        );

        setSessionQueue(queue);
        setIsSessionComplete(queue.length === 0);
    };

    const addExtraWordsToday = (count: number) => {
        setExtraNewWordsToday(prev => {
            const newExtra = prev + count;
            setIsSessionComplete(false);
            // 明确传递当前的 base 和新的 extra
            generateSession(words, dailyNewTarget, newExtra);
            return newExtra;
        });
    };

    const updateReview = async (wordId: number, rating: Rating) => {
        if (!db) return;

        const wordIndex = words.findIndex(w => w.id === wordId);
        if (wordIndex === -1) return;

        const currentWord = words[wordIndex];
        const updatedReviewItem = calculateReview(currentWord.reviewItem, rating);

        // 更新数据库
        const nowIso = new Date().toISOString();
        const todayStr = nowIso.split('T')[0];

        await db.runAsync(`
            INSERT INTO progress (word_id, interval, repetition, efactor, last_review_date, due_date, first_review_date, total_reviews, correct_count, wrong_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(word_id) DO UPDATE SET
                interval = excluded.interval,
                repetition = excluded.repetition,
                efactor = excluded.efactor,
                last_review_date = excluded.last_review_date,
                due_date = excluded.due_date,
                total_reviews = excluded.total_reviews,
                correct_count = excluded.correct_count,
                wrong_count = excluded.wrong_count,
                first_review_date = COALESCE(progress.first_review_date, ?)
        `, [
            wordId,
            updatedReviewItem.interval,
            updatedReviewItem.repetition,
            updatedReviewItem.efactor,
            nowIso,
            updatedReviewItem.dueDate.toISOString(),
            nowIso, // newValue for first_review_date
            updatedReviewItem.totalReviews,
            updatedReviewItem.correctCount,
            updatedReviewItem.wrongCount,
            nowIso // first_review_date override value
        ]);

        // 同时更新内存中的首次学习日期
        if (!(currentWord as any).firstReviewDate) {
            (currentWord as any).firstReviewDate = nowIso;
        }

        // 更新用户统计（AsyncStorage）
        const stats = await loadUserStats();
        const today = new Date().toISOString().split('T')[0];
        const newStats = {
            ...stats,
            totalReviews: (stats.totalReviews || 0) + 1,
            history: { ...stats.history, [today]: (stats.history[today] || 0) + 1 }
        };
        await saveUserStats(newStats);

        // 更新内存状态
        const newWords = [...words];
        newWords[wordIndex] = { ...currentWord, reviewItem: updatedReviewItem };
        setWords(newWords);

        // 核心逻辑修改：如果是不认识 (Again)，插队到稍后重现；如果是认识 (Good)，彻底移除
        setSessionQueue(prev => {
            console.log('[WordContext] updateReview - Before:', 'Queue length:', prev.length, 'Rating:', rating, 'WordId:', wordId);

            if (rating === Rating.Again) {
                const targetIndex = prev.findIndex(w => w.id === wordId);
                if (targetIndex === -1) {
                    console.log('[WordContext] ERROR: Word not found in queue!');
                    return prev;
                }

                const target = prev[targetIndex];
                const remaining = prev.filter(w => w.id !== wordId);

                // 算法：将忘记的词插在 5-8 个位置之后
                const insertIndex = Math.min(remaining.length, 5 + Math.floor(Math.random() * 3));
                const newQueue = [...remaining];
                newQueue.splice(insertIndex, 0, { ...target, reviewItem: updatedReviewItem });

                console.log('[WordContext] updateReview - Again: New queue length:', newQueue.length, 'Insert at:', insertIndex, 'Next word:', newQueue[0]?.word);
                return newQueue;
            } else {
                const remaining = prev.filter(w => w.id !== wordId);
                console.log('[WordContext] updateReview - Good: New queue length:', remaining.length, 'Next word:', remaining[0]?.word);

                if (remaining.length === 0) {
                    console.log('[WordContext] Session complete!');
                    setIsSessionComplete(true);
                }
                return remaining;
            }
        });
    };

    const toggleWordMark = (wordId: number) => {
        setWords(prev =>
            prev.map(w =>
                w.id === wordId ? { ...w, isImportant: !w.isImportant } : w
            )
        );
    };

    const refreshSession = () => {
        console.log('[WordContext] Refreshing session...');
        setIsSessionComplete(false);
        generateSession(words);
    };

    const saveAIAnalysis = async (wordId: number, analysis: any) => {
        if (!db) return;

        console.log(`[WordContext] Saving AI Analysis for word ID: ${wordId}`);
        const sentencesJson = JSON.stringify(analysis.sentences || []);

        await db.runAsync(`
            UPDATE vocabulary 
            SET ai_tips = ?, breakdown = ?, ai_usage = ?, ai_mnemonic = ?, ai_sentences = ?, ai_meaning = ?, category = ?, pos = ?
            WHERE id = ?
        `, [
            analysis.hanja_logic,
            analysis.morphology,
            analysis.distinction,
            analysis.mnemonic,
            sentencesJson,
            analysis.meaning,
            analysis.category,
            analysis.pos,
            wordId
        ]);

        // 同时更新内存状态
        const updateFn = (w: WordWithSRS) =>
            w.id === wordId ? {
                ...w,
                hanja_logic: analysis.hanja_logic,
                breakdown: analysis.morphology,
                ai_usage: analysis.distinction,
                ai_mnemonic: analysis.mnemonic,
                sentences: analysis.sentences || w.sentences,
                ai_meaning: analysis.meaning,
                category: analysis.category,
                pos: analysis.pos
            } : w;

        setWords(prev => prev.map(updateFn));
        setSessionQueue(prev => prev.map(updateFn));
    };

    const addCustomWord = async (word: string, translation: string, level: string | number) => {
        if (!db) return;
        try {
            await db.runAsync(
                'INSERT INTO vocabulary (word, cn, level) VALUES (?, ?, ?)',
                [word, translation, level]
            );
            await loadWords(db);
        } catch (e) {
            console.error("Add word error:", e);
        }
    };

    const resetAllData = async () => {
        if (!db) return;
        await db.runAsync('DELETE FROM progress');
        await loadWords(db);
    };

    const repairDatabase = async () => {
        const docDir = (FileSystem as any).documentDirectory;
        const dbName = 'vocabulary_v2.db';
        const dbPath = docDir ? docDir + 'SQLite/' + dbName : '';

        if (db) await db.closeAsync();
        if (dbPath) {
            await (FileSystem as any).deleteAsync(dbPath, { idempotent: true });
        }
        // 重置后重新初始化
        await initDatabase();
    };

    const fetchRemoteLibrary = async (url: string) => {
        if (!db) return 0;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (Array.isArray(data)) {
                await db.runAsync('BEGIN TRANSACTION');
                for (const item of data) {
                    await db.runAsync(
                        'INSERT INTO vocabulary (word, cn, level) VALUES (?, ?, ?)',
                        [item.word, item.translation || item.cn || '', item.level || 'B']
                    );
                }
                await db.runAsync('COMMIT');
                await loadWords(db);
                return data.length;
            }
            return 0;
        } catch (e) {
            console.error("Fetch remote library error:", e);
            throw e;
        }
    };

    const exportBackup = async () => {
        if (!db) return;
        try {
            // 1. 获取所有数据
            const vocabResult = await db.getAllAsync('SELECT * FROM vocabulary');
            const progressResult = await db.getAllAsync('SELECT * FROM progress');

            const backupData = {
                version: 1,
                date: new Date().toISOString(),
                vocabulary: vocabResult,
                progress: progressResult
            };

            // 2. 写入临时文件
            const json = JSON.stringify(backupData, null, 2);
            const fileName = `nora_backup_${new Date().toISOString().split('T')[0]}.json`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(fileUri, json);

            // 3. 调起分享
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                alert("此设备不支持分享功能");
            }
        } catch (e) {
            console.error(e);
            alert("备份失败: " + e);
        }
    };

    const importData = async () => {
        if (!db) return;
        try {
            // 1. 选文件
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;
            const fileUri = result.assets[0].uri;

            // 2. 读内容
            const jsonContent = await FileSystem.readAsStringAsync(fileUri);
            const backup = JSON.parse(jsonContent);

            if (!backup.vocabulary || !backup.progress) {
                alert("无效的备份文件：缺少核心数据");
                return;
            }

            // 3. 写入数据库 (Transaction)
            // 注意：这是高危操作，先清空
            await db.withTransactionAsync(async () => {
                await db.runAsync('DELETE FROM vocabulary');
                await db.runAsync('DELETE FROM progress');

                // 批量插入 vocabulary
                for (const word of backup.vocabulary) {
                    await db.runAsync(
                        `INSERT INTO vocabulary (id, word, level, breakdown, cn, hanja, phrase1, phrase1_cn, phrase2, phrase2_cn, ai_mnemonic, ai_usage, ai_tips, category, pos, ai_sentences, ai_meaning)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [word.id, word.word, word.level, word.breakdown, word.cn, word.hanja, word.phrase1, word.phrase1_cn, word.phrase2, word.phrase2_cn, word.ai_mnemonic, word.ai_usage, word.ai_tips, word.category, word.pos, word.ai_sentences, word.ai_meaning]
                    );
                }

                // 批量插入 progress
                for (const p of backup.progress) {
                    await db.runAsync(
                        `INSERT INTO progress (word_id, ease_factor, interval, repetitions, review_date, first_review_date, review_history)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [p.word_id, p.ease_factor, p.interval, p.repetitions, p.review_date, p.first_review_date, p.review_history]
                    );
                }
            });

            alert(`恢复成功！共导入 ${backup.vocabulary.length} 个单词，${backup.progress.length} 条进度。`);

            // 4. 刷新 App 状态
            // 4. 刷新 App 状态
            loadWords(db);

        } catch (e) {
            console.error(e);
            alert("导入失败: " + e);
        }
    };

    return (
        <WordContext.Provider
            value={{
                words,
                sessionQueue,
                isSessionComplete,
                isLoading,
                updateReview,
                toggleWordMark,
                saveAIAnalysis,
                refreshSession,
                dailyNewTarget,
                updateDailyNewTarget,
                addCustomWord,
                resetAllData,
                repairDatabase,
                addExtraWordsToday,
                fetchRemoteLibrary,
                exportBackup,
                importData
            }}
        >
            {children}
        </WordContext.Provider>
    );
}

export function useWords() {
    const context = useContext(WordContext);
    if (context === undefined) {
        throw new Error('useWords must be used within a WordProvider');
    }
    return context;
}

export const useWordContext = useWords;
