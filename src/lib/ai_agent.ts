// 这是一个客户端调用 AI 的示例。
// 重要：API Key 已改为从设置中动态读取，不再硬编码。
const DEFAULT_MODEL = "gemini-2.0-flash";

export interface AIAnalysisResult {
    meaning: string;       // 核心中文含义
    morphology: string;    // 形态学拆解
    hanja_logic: string;   // 汉字词逻辑
    distinction: string;   // 辨析
    sentences: string[];   // 例句（带翻译）
    mnemonic: string;      // 助记法
    category: string;      // 分类标签
    pos: string;          // 词性
}

export async function fetchAIDeepAnalysis(word: string, apiKey?: string): Promise<AIAnalysisResult> {
    if (!apiKey) {
        throw new Error("请先在设置中配置您的 Gemini API Key");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

    const prompt = `
    你是一位精通韩语和汉语的语言学专家，专门为 TOPIK 高级学习者提供解析。
    请对韩语单词 "${word}" 进行深度解析，并严格按照以下 JSON 格式返回：

    {
      "meaning": "该单词最准确地道的中文核心释义（包含词性说明，如：名词。意为...）",
      "morphology": "形态学详细拆解，如：词干+后缀，解释词性变化逻辑",
      "hanja_logic": "汉字词逻辑，列出每个音节对应的汉字（如有）及其含义，如：[學(学) + 習(习) = 学习]",
      "distinction": "不仅提供辨析，还提供这个词最地道的搭配（Collocations）",
      "sentences": [
        "地道的韩语例句 1 (带中文翻译)",
        "地道的韩语例句 2 (带中文翻译)",
        "地道的韩语例句 3 (带中文翻译)"
      ],
      "mnemonic": "一个巧妙的趣味记忆法或语境联想法",
      "category": "必须严格从以下列表中选择最匹配的一个：[生活, 职场, 情感, 社会, 经济, 政治, 文化, 科技, 自然, 医学, 历史, 抽象]",
      "pos": "该单词的词性（如：名词, 动词, 形容词, 副词）"
    }

    要求：内容要深刻、准确、地道。如果是固有词，请在 hanja_logic 中注明“固有词”。分类必须从列表中单选。
    只返回纯 JSON 字符串，不要任何 Markdown 或文字说明。
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                }
            })
        });

        if (!response.ok) {
            throw new Error(`AI Request failed: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("AI returned empty result");

        // 鲁棒性处理：如果 AI 抽风带了 ```json ... ``` 标签，尝试提取内部内容
        let cleanText = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }

        const result = JSON.parse(cleanText);

        return {
            meaning: result.meaning || "无法获取核心含义",
            morphology: result.morphology || result.analysis || "无法获取解析",
            hanja_logic: result.hanja_logic || result.etymology || "暂无深度解析",
            distinction: result.distinction || result.usage || "暂无辨析",
            sentences: Array.isArray(result.sentences) ? result.sentences : ["暂无地道例句"],
            mnemonic: result.mnemonic || "暂无助记法",
            category: result.category || "未分类",
            pos: result.pos || "未知"
        };
    } catch (error) {
        console.error("[AI Agent] Gemini call error:", error);
        return {
            meaning: "解析暂时不可用",
            morphology: "原因：网络波动或 API 限制",
            hanja_logic: "建议稍后再试",
            distinction: "您可以尝试再次点击 AI 解析按钮",
            sentences: ["错误详情: " + error],
            mnemonic: "暂无助记",
            category: "错误",
            pos: "未知"
        };
    }
}
