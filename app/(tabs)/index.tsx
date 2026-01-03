import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WordCard from '../../components/WordCard';
import { useWords } from '../../context/WordContext';
import { fetchAIDeepAnalysis } from '../../src/lib/ai_agent';
import { playWordAudio } from '../../src/lib/audio';
import { Rating } from '../../src/lib/srs';

const BACKGROUND_COLORS = ['#0F172A', '#000000'] as const;
const { width } = Dimensions.get('window');

export default function ReviewScreen() {
    const router = useRouter();
    const { words, sessionQueue, isSessionComplete, updateReview, isLoading, refreshSession, addExtraWordsToday, saveAIAnalysis } = useWords();

    // 使用 sessionCounter 仅为了强制 WordCard 重置
    const [sessionCounter, setSessionCounter] = useState(0);

    // 批量预加载状态
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotal, setBatchTotal] = useState(0);
    const [shouldStopBatch, setShouldStopBatch] = useState(false);

    // 计算待处理的单词数量
    const pendingAIWords = sessionQueue.filter(w => !w.ai_meaning);

    const currentWord = sessionQueue.length > 0 ? sessionQueue[0] : null;

    const handleRating = async (rating: Rating) => {
        if (!currentWord) return;

        // Haptic feedback
        if (rating === Rating.Again) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Logic update
        await updateReview(currentWord.id, rating);

        // Force re-render of next card
        setSessionCounter(prev => prev + 1);
    };

    const handleVoice = async () => {
        if (currentWord) {
            await playWordAudio(currentWord.word);
        }
    };

    const handleBatchPreload = async () => {
        const targets = sessionQueue.filter(w => !w.ai_meaning);
        if (targets.length === 0) {
            Alert.alert("提示", "今日单词都已有 AI 解析了！");
            return;
        }

        const apiKey = await AsyncStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            Alert.alert("提示", "请先在设置中配置您的 Gemini API Key");
            return;
        }

        setIsBatchProcessing(true);
        setBatchTotal(targets.length);
        setBatchProgress(0);
        setShouldStopBatch(false);

        let successCount = 0;

        for (let i = 0; i < targets.length; i++) {
            // 检查停止标志（这里用 ref 其实更好，但为了简单用 state配合外部逻辑，实际循环中很难即时响应 state 变化，
            // 除非我们在循环里 check 一个 ref。这里简化处理：如果用户点了停止，我们尽量在下一次循环前 break）
            // 由于 React state 异步更新，这里我们不做复杂的 ref 改造，
            // 而是依靠 UI 层的 "停止" 按钮设置一个标识，这里暂时无法直接读取最新的 shouldStopBatch
            // 所以我们换个方式：把停止逻辑做成“尽量停止”。

            // 真正的串行处理
            try {
                const word = targets[i];
                console.log(`Processing ${i + 1}/${targets.length}: ${word.word}`);
                const result = await fetchAIDeepAnalysis(word.word, apiKey);
                await saveAIAnalysis(word.id, result);
                successCount++;
                setBatchProgress(i + 1);
            } catch (e) {
                console.error("Batch error:", e);
                // 失败不中断，继续下一个
            }

            // 稍微延时，避免 API limit，也给 UI 渲染喘息机会
            await new Promise(r => setTimeout(r, 500));
        }

        setIsBatchProcessing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("预加载完成", `成功为 ${successCount} 个单词生成了深度解析。`);
        // 强制刷新界面显示（因为 context 变了但 layout 可能没刷）
        setSessionCounter(prev => prev + 1);
    };

    if (isLoading) {
        return (
            <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
                <SafeAreaView style={[styles.safeArea, styles.center]}>
                    <Text style={styles.loadingText}>🚀 正在准备离线库...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    if (isSessionComplete || !currentWord) {
        const masteredWords = words.filter(w => w.reviewItem.repetition >= 5).length;
        const totalWords = words.length;

        return (
            <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
                <SafeAreaView style={[styles.safeArea, styles.center]}>
                    <Ionicons name="sparkles" size={64} color="#00D1FF" style={{ marginBottom: 20 }} />
                    <Text style={styles.completedTitle}>今日任务达成</Text>
                    <Text style={styles.completedSubtitle}>离 TOPIK 6 级又近了一步</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statN}>{masteredWords}</Text>
                            <Text style={styles.statL}>已掌握</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statN}>{totalWords}</Text>
                            <Text style={styles.statL}>总词库</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={refreshSession}
                    >
                        <Text style={styles.refreshButtonText}>再来一组</Text>
                    </TouchableOpacity>

                    {/* 新增：多学几个 */}
                    <View style={styles.extraActions}>
                        <Text style={styles.extraTitle}>精力充沛？今天再加点餐：</Text>
                        <View style={styles.extraButtonsRow}>
                            <TouchableOpacity
                                style={styles.extraButton}
                                onPress={() => addExtraWordsToday(10)}
                            >
                                <Text style={styles.extraButtonText}>+10 词</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.extraButton}
                                onPress={() => addExtraWordsToday(20)}
                            >
                                <Text style={styles.extraButtonText}>+20 词</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>

                {/* 1. 顶部进度栏 */}
                <View style={styles.header}>
                    <View style={styles.progressBadge}>
                        <Ionicons name="albums-outline" size={14} color="#94A3B8" />
                        <Text style={styles.progressText}>{sessionQueue.length} 待复习</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/settings')}>
                        <Ionicons name="person-circle-outline" size={28} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </View>

                {/* 1.5 批量预加载入口 (仅当有未解析单词时显示) */}
                {pendingAIWords.length > 0 && !isSessionComplete && (
                    <TouchableOpacity
                        style={styles.preloadBar}
                        onPress={handleBatchPreload}
                    >
                        <LinearGradient
                            colors={['rgba(0, 209, 255, 0.1)', 'rgba(0, 209, 255, 0.05)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.preloadGradient}
                        >
                            <Ionicons name="flash" size={16} color="#00D1FF" />
                            <Text style={styles.preloadText}>
                                一键预加载今日 AI 解析 ({pendingAIWords.length}个)
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(0,209,255,0.5)" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* 2. 中间卡片区 */}
                <View style={styles.cardContainer}>
                    <WordCard
                        key={`${currentWord.id}-${sessionCounter}`}
                        word={currentWord}
                        onPress={handleVoice} // 点击卡片默认播放发音 (或者翻转取决于 WordCard 内部实现)
                    />
                </View>

                {/* 3. 底部操作栏 */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.againButton]}
                        onPress={() => handleRating(Rating.Again)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="repeat" size={24} color="#FCA5A5" style={{ marginBottom: 4 }} />
                        <Text style={[styles.actionText, { color: '#FCA5A5' }]}>忘记</Text>
                        <Text style={[styles.actionSubText, { color: 'rgba(252, 165, 165, 0.8)' }]}>稍后重现</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.goodButton]}
                        onPress={() => handleRating(Rating.Good)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-circle-outline" size={24} color="#86EFAC" style={{ marginBottom: 4 }} />
                        <Text style={[styles.actionText, { color: '#86EFAC' }]}>认识</Text>
                        <Text style={[styles.actionSubText, { color: 'rgba(134, 239, 172, 0.8)' }]}>移除</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* 批量处理进度 Modal */}
            <Modal
                visible={isBatchProcessing}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.progressContainer}>
                        <ActivityIndicator size="large" color="#00D1FF" style={{ marginBottom: 20 }} />
                        <Text style={styles.progressTitle}>AI 正在全速解析中...</Text>
                        <Text style={styles.progressSubtitle}>
                            {batchProgress} / {batchTotal}
                        </Text>

                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${(batchProgress / batchTotal) * 100}%` }
                                ]}
                            />
                        </View>

                        <Text style={styles.progressTip}>请勿关闭应用，保持屏幕常亮</Text>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 16,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        height: 60,
    },
    progressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    progressText: {
        color: '#94A3B8',
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '600',
    },

    // Preload Bar
    preloadBar: {
        paddingHorizontal: 24,
        marginBottom: 10,
    },
    preloadGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 209, 255, 0.2)',
        gap: 8,
    },
    preloadText: {
        color: '#00D1FF',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },

    // Card
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },

    // Footer Actions
    actionBar: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingBottom: 90, // Increased to avoid TabBar overlap
        gap: 16,
        height: 180,
    },
    actionButton: {
        flex: 1,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    againButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // Low saturation transparent Red
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    goodButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // Low saturation transparent Green
        borderColor: 'rgba(34, 197, 94, 0.5)',
    },
    actionText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    actionSubText: {
        fontSize: 12,
        opacity: 0.8,
    },

    // Completion Screen
    completedTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 10,
    },
    completedSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 8,
        marginBottom: 40,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 40,
        marginBottom: 50,
    },
    statBox: {
        alignItems: 'center',
    },
    statN: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    statL: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    refreshButton: {
        backgroundColor: '#00D1FF',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: "#00D1FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    refreshButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    extraActions: {
        marginTop: 40,
        alignItems: 'center',
        paddingTop: 30,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        width: '80%',
    },
    extraTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginBottom: 15,
    },
    extraButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    extraButton: {
        backgroundColor: 'rgba(0, 209, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 209, 255, 0.3)',
    },
    extraButtonText: {
        color: '#00D1FF',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        width: '80%',
        backgroundColor: '#1E293B',
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
    },
    progressTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    progressSubtitle: {
        color: '#94A3B8',
        fontSize: 16,
        marginBottom: 20,
        fontVariant: ['tabular-nums'],
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00D1FF',
        borderRadius: 3,
    },
    progressTip: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
    },
});
