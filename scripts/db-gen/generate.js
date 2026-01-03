
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 模拟 AI 生成的深度解析数据 (针对前20个作为示例，其余保持基础数据)
const enrichedData = {
    "가격": { hanja: "价格", hanja_logic: "价(값 가) + 格(격식 격) = 物品的价值规格", breakdown: "名词", sentences: ["가격이 너무 비싸요. (价格太贵了)", "가격을 깎아 주세요. (请便宜一点)"] },
    "가나다": { hanja: "None", hanja_logic: "韩国语字母顺序的前三个", breakdown: "名词", sentences: ["가나다 순으로 정렬하세요. (请按字母顺序排列)", "아이들이 가나다를 배워요. (孩子们在学习基本字母)"] },
    "가능": { hanja: "可能", hanja_logic: "可(옳을 가) + 能(능할 능) = 能够做到的能力", breakdown: "名词", sentences: ["주차 가능합니다. (可以停车)", "성공 가능성이 높아요. (成功的可能性很高)"] },
    "가치": { hanja: "价值", hanja_logic: "价(값 가) + 值(값 치) = 事物所包含的意义或重要性", breakdown: "名词", sentences: ["가치가 높은 정보입니다. (这是价值很高的信息)", "시간의 가치를 알아야 해요. (应该知道时间的价值)"] },
    "경향": { hanja: "倾向", hanja_logic: "倾(기울 경) + 向(향할 향) = 趋势或偏向", breakdown: "名词", sentences: ["소비 경향이 바뀌고 있어요. (消费倾向正在改变)", "그는 낙관적인 경향이 있다. (他有乐观的倾向)"] }
    // ... 实际应用中会通过 AI 接口批量生成
};

async function generateDB() {
    const jsonPath = path.join(__dirname, '../../topik_vocab.json');
    const dbPath = path.join(__dirname, '../../assets/vocabulary.db');

    // 确保 assets 目录存在
    if (!fs.existsSync(path.join(__dirname, '../../assets'))) {
        fs.mkdirSync(path.join(__dirname, '../../assets'));
    }

    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    const vocab = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    // 筛选 Level B (中级) 的前 100 个
    const top100 = vocab.filter(w => w.level === 'B').slice(0, 100);

    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        // 创建表
        db.run(`CREATE TABLE vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            level TEXT,
            translation TEXT,
            hanja TEXT,
            hanja_logic TEXT,
            breakdown TEXT,
            sentences_json TEXT
        )`);

        db.run(`CREATE TABLE progress (
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
        )`);

        const stmt = db.prepare(`INSERT INTO vocabulary (word, level, translation, hanja, hanja_logic, breakdown, sentences_json) VALUES (?, ?, ?, ?, ?, ?, ?)`);

        top100.forEach(item => {
            const enriched = enrichedData[item.word] || {
                hanja: "",
                hanja_logic: "",
                breakdown: "词性待校对",
                sentences: ["例句准备中...", "Example sentence..."]
            };

            stmt.run(
                item.word,
                item.level,
                item.translation || "暂无翻译",
                enriched.hanja,
                enriched.hanja_logic,
                enriched.breakdown,
                JSON.stringify(enriched.sentences)
            );
        });

        stmt.finalize();
        console.log(`Successfully generated vocabulary.db with ${top100.length} words.`);
    });

    db.close();
}

generateDB();
