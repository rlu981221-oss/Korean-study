const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 配置路径
const JSON_FILE = path.join(__dirname, '../topik_vocab.json');
const ASSETS_DIR = path.join(__dirname, '../assets');
const DB_FILE = path.join(ASSETS_DIR, 'vocabulary_v2.db');

// 确保 assets 目录存在
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR);
}

// 如果数据库已存在，先删除（为了重新生成）
if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
}

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
    console.log('正在创建表结构...');

    // 创建单词表
    db.run(`
        CREATE TABLE vocabulary (
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
        )
    `);

    // 创建进度表
    db.run(`
        CREATE TABLE progress (
            word_id INTEGER PRIMARY KEY,
            interval INTEGER DEFAULT 0,
            repetition INTEGER DEFAULT 0,
            efactor REAL DEFAULT 2.5,
            last_review_date TEXT,
            due_date TEXT,
            total_reviews INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            wrong_count INTEGER DEFAULT 0,
            FOREIGN KEY(word_id) REFERENCES vocabulary(id)
        )
    `);

    console.log('读取 JSON 数据...');
    const rawData = fs.readFileSync(JSON_FILE, 'utf8');
    const words = JSON.parse(rawData);
    console.log(`载入 ${words.length} 个单词，开始写入数据库...`);

    const stmt = db.prepare(`
        INSERT INTO vocabulary (word, level, cn, breakdown) 
        VALUES (?, ?, ?, ?)
    `);

    db.run('BEGIN TRANSACTION');

    words.forEach((item, index) => {
        // 将 B 映射为 4级左右，C 映射为 5-6级
        // 这里的 breakdown 暂时填入 translation 里的内容，或者留空
        stmt.run(
            item.word,
            item.level,
            item.translation || '',
            '' // 暂时留空，等待 AI 后续填充
        );

        if ((index + 1) % 1000 === 0) {
            console.log(`已写入 ${index + 1} 个单词...`);
        }
    });

    db.run('COMMIT');
    stmt.finalize();

    console.log('数据库构建完成！');
    console.log(`生成文件: ${DB_FILE}`);
});

db.close();
