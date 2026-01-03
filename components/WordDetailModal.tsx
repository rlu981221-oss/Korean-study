import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWordContext, WordWithSRS } from '../context/WordContext';
import { fetchAIDeepAnalysis } from '../src/lib/ai_agent';

interface WordDetailModalProps {
    visible: boolean;
    word: WordWithSRS | null;
    onClose: () => void;
}

export default function WordDetailModal({ visible, word, onClose }: WordDetailModalProps) {
    const { saveAIAnalysis } = useWordContext();
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [localWord, setLocalWord] = React.useState<WordWithSRS | null>(word);

    React.useEffect(() => {
        setLocalWord(word);
    }, [word]);

    if (!localWord) return null;

    const handleGenerateAI = async () => {
        if (localWord.ai_meaning) {
            Alert.alert(
                "确认重新生成",
                "该单词已有 AI 解析，重新生成将消耗 Token，确定要继续吗？",
                [
                    { text: "取消", style: "cancel" },
                    {
                        text: "确定",
                        onPress: performGeneration
                    }
                ]
            );
        } else {
            performGeneration();
        }
    };

    const performGeneration = async () => {
        if (!localWord) return;

        const apiKey = await AsyncStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            Alert.alert("提示", "请先在设置中配置您的 Gemini API Key");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await fetchAIDeepAnalysis(localWord.word, apiKey);
            await saveAIAnalysis(localWord.id, result);

            // 立即更新本地状态，实现即时刷新
            setLocalWord(prev => prev ? ({
                ...prev,
                ai_meaning: result.meaning,
                hanja_logic: result.hanja_logic,
                breakdown: result.morphology, // 注意字段对应
                ai_usage: result.distinction,
                ai_mnemonic: result.mnemonic,
                sentences: result.sentences,
                category: result.category,
                pos: result.pos
            }) : null);

            Alert.alert("成功", "AI 深度解析已更新！");
        } catch (error) {
            Alert.alert("失败", "AI 解析请求失败，请稍后重试。");
        } finally {
            setIsGenerating(false);
        }
    };

    const renderAISection = (title: string, content: string | null | undefined, icon: any, color: string) => {
        if (!content) return null;
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name={icon} size={18} color={color} />
                    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
                </View>
                <View style={[styles.contentCard, { borderLeftColor: color }]}>
                    <Text style={styles.contentText}>{content}</Text>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>单词详情</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.wordHero}>
                            <Text style={styles.wordText}>{localWord.word}</Text>
                            <Text style={styles.translationText}>{localWord.translation}</Text>
                            {localWord.hanja && <Text style={styles.hanjaText}>汉字: {localWord.hanja}</Text>}
                        </View>

                        {/* AI 核心释义 */}
                        {localWord.ai_meaning && (
                            <View style={styles.meaningHighlight}>
                                <Text style={styles.meaningLabel}>AI 精准释义</Text>
                                <Text style={styles.meaningContent}>{localWord.ai_meaning}</Text>
                            </View>
                        )}

                        {renderAISection('拆解与逻辑', localWord.breakdown || localWord.hanja_logic, 'git-network-outline', '#00D1FF')}
                        {renderAISection('助记技巧', localWord.ai_mnemonic, 'bulb-outline', '#FFD700')}
                        {renderAISection('用法区别', localWord.ai_usage, 'git-compare-outline', '#86EFAC')}

                        {/* 例句部分 */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="book-outline" size={18} color="#FF9F43" />
                                <Text style={[styles.sectionTitle, { color: '#FF9F43' }]}>典型例句</Text>
                            </View>
                            <View style={styles.sentencesContainer}>
                                {localWord.sentences.map((sentence, idx) => (
                                    <View key={idx} style={styles.sentenceItem}>
                                        <Text style={styles.sentenceText}>• {sentence}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    {/* AI 生成按钮固定在底部 */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.aiButton, isGenerating && styles.aiButtonDisabled]}
                            onPress={handleGenerateAI}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <Ionicons name={localWord.ai_meaning ? "refresh" : "sparkles"} size={20} color="#000" />
                                    <Text style={styles.aiButtonText}>
                                        {localWord.ai_meaning ? "重新生成 AI 解析" : "获取 AI 深度解析"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        paddingTop: 20,
        paddingBottom: 30, // 为底部按钮留出空间
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    wordHero: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 30,
        borderRadius: 20,
    },
    wordText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    translationText: {
        fontSize: 20,
        color: '#00D1FF',
        fontWeight: '500',
    },
    hanjaText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 8,
    },
    meaningHighlight: {
        backgroundColor: 'rgba(0, 209, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(0, 209, 255, 0.2)',
    },
    meaningLabel: {
        color: '#00D1FF',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    meaningContent: {
        color: '#FFF',
        fontSize: 16,
        lineHeight: 24,
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    contentCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
    },
    contentText: {
        color: '#CBD5E1',
        fontSize: 14,
        lineHeight: 22,
    },
    sentencesContainer: {
        gap: 12,
    },
    sentenceItem: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 12,
        borderRadius: 10,
    },
    sentenceText: {
        color: '#94A3B8',
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#0F172A',
    },
    aiButton: {
        backgroundColor: '#00D1FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    aiButtonDisabled: {
        opacity: 0.7,
    },
    aiButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
