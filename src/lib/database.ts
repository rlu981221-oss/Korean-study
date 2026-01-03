import * as SQLite from 'expo-sqlite';

const DB_NAME = 'vocabulary.db';

export async function initializeDatabase() {
    try {
        console.log("[DB] Opening database...");

        // 1. 直接打开数据库。如果是 Web 或者 native 环境，expo-sqlite 会处理默认路径
        const database = await SQLite.openDatabaseAsync(DB_NAME);

        // 2. 初始化核心表结构 (WAL 模式提高性能)
        await database.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                level TEXT,
                translation TEXT,
                hanja TEXT,
                hanja_logic TEXT,
                breakdown TEXT,
                sentences_json TEXT
            );
            CREATE TABLE IF NOT EXISTS progress (
                word_id INTEGER PRIMARY KEY,
                interval INTEGER DEFAULT 0,
                repetition INTEGER DEFAULT 0,
                efactor REAL DEFAULT 2.5,
                last_review_date TEXT,
                due_date TEXT,
                total_reviews INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                wrong_count INTEGER DEFAULT 0,
                is_mastered INTEGER DEFAULT 0,
                is_important INTEGER DEFAULT 0
            );
        `);

        // 3. 检查是否有数据，如果没有则进行“播种”
        const result = await database.getFirstAsync<{ count: number }>("SELECT count(*) as count FROM vocabulary");
        if (!result || result.count === 0) {
            console.log("[DB] Database is empty. Seeding from JSON source...");
            await seedDatabase(database);
        }

        console.log("[DB] Database ready.");
        return database;

    } catch (error) {
        console.error("[DB] Critical initialization error:", error);
        throw error;
    }
}

async function seedDatabase(db: SQLite.SQLiteDatabase) {
    try {
        // 直接从本地 JSON 导入数据 (React Native 支持 require JSON)
        const vocabData = require('../../topik_vocab.json');

        // 针对前 100 个单词进行播种（包含部分模拟的深度解析数据）
        const seedBatch = vocabData.filter((w: any) => w.level === 'B').slice(0, 100);

        await db.withTransactionAsync(async () => {
            for (const item of seedBatch) {
                // 模拟部分 AI 深度解析 (如果是我们之前定义的特定词汇)
                const enriched = {
                    hanja: item.word === "가격" ? "价格" : "",
                    hanja_logic: item.word === "가격" ? "价(값 가) + 格(격식 격) = 规格" : "",
                    breakdown: "名词",
                    sentences: ["예문 1입니다.", "Example sentence 2."]
                };

                await db.runAsync(
                    `INSERT INTO vocabulary (word, level, translation, hanja, hanja_logic, breakdown, sentences_json) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [item.word, item.level, item.translation || "暂无翻译", enriched.hanja, enriched.hanja_logic, enriched.breakdown, JSON.stringify(enriched.sentences)]
                );
            }
        });
        console.log(`[DB] Successfully seeded ${seedBatch.length} words.`);
    } catch (err) {
        console.error("[DB] Seeding failed:", err);
    }
}

/**
 * 强制清除数据库内容 (用于调试)
 */
export async function clearDatabase(db: SQLite.SQLiteDatabase) {
    await db.execAsync("DELETE FROM vocabulary; DELETE FROM progress;");
    console.log("[DB] Data cleared.");
}
