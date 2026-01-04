import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WordWithSRS, useWords } from '../context/WordContext';
import { fetchAIDeepAnalysis } from '../src/lib/ai_agent';

const { width, height: screenHeight } = Dimensions.get('window');

interface WordCardProps {
    word: WordWithSRS;
    onPress?: () => void;
    forceFlipBack?: boolean; // 新增：父组件强制翻面
}

export default function WordCard({ word, onPress, forceFlipBack }: WordCardProps) {
    const { saveAIAnalysis } = useWords();
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);

    // 当换词时，自动翻回正面
    useEffect(() => {
        animatedValue.setValue(0);
        setIsFlipped(false);
    }, [word.id]);

    // 监听强制翻面指令
    useEffect(() => {
        if (forceFlipBack && !isFlipped) {
            handleFlip();
        }
    }, [forceFlipBack]);

    const handleFlip = () => {
        if (!isFlipped && onPress) onPress();

        if (isFlipped) {
            Animated.spring(animatedValue, {
                toValue: 0,
                friction: 8,
                tension: 10,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.spring(animatedValue, {
                toValue: 180,
                friction: 8,
                tension: 10,
                useNativeDriver: true,
            }).start();
        }
        setIsFlipped(!isFlipped);
    };

    const handleAIAnalysis = async () => {
        if (isAILoading) return;

        const apiKey = await AsyncStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            Alert.alert("提示", "请先在设置中配置您的 Gemini API Key");
            return;
        }

        setIsAILoading(true);
        try {
            const result = await fetchAIDeepAnalysis(word.word, apiKey);
            await saveAIAnalysis(word.id, result);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "AI 解析失败，请检查网络或 Key 配额");
        } finally {
            setIsAILoading(false);
        }
    };

    const frontInterpolate = animatedValue.interpolate({
        inputRange: [0, 180],
        outputRange: ['0deg', '180deg'],
    });

    const backInterpolate = animatedValue.interpolate({
        inputRange: [0, 180],
        outputRange: ['180deg', '360deg'],
    });

    const frontAnimatedStyle = {
        transform: [{ rotateY: frontInterpolate }],
    };

    const backAnimatedStyle = {
        transform: [{ rotateY: backInterpolate }],
    };

    return (
        <View style={styles.container}>
            {/* 正面 Card */}
            {!isFlipped && (
                <Animated.View style={[styles.card, styles.frontCard, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
                    <Pressable onPress={handleFlip} style={styles.pressableContainer}>
                        <Text style={styles.hangul}>{word.word}</Text>
                        <View style={styles.tapHint}>
                            <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.hintText}>点击查看解析</Text>
                        </View>
                    </Pressable>
                </Animated.View>
            )}

            {/* 反面 Card */}
            {isFlipped && (
                <Animated.View style={[styles.card, styles.backCard, backAnimatedStyle, { backfaceVisibility: 'hidden', position: 'absolute' }]}>
                    <View style={styles.backHeader}>
                        <TouchableOpacity onPress={handleFlip} style={styles.wordTitleContainer}>
                            <Ionicons name="chevron-back" size={24} color="#00D1FF" style={{ marginRight: 4 }} />
                            <Text style={[styles.hangul, styles.smallHangul]}>{word.word}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.aiButton}
                            onPress={handleAIAnalysis}
                            disabled={isAILoading}
                        >
                            {isAILoading ? (
                                <ActivityIndicator size="small" color="#00D1FF" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={16} color="#00D1FF" />
                                    <Text style={styles.aiButtonText}>AI 解析</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.backContent}
                        showsVerticalScrollIndicator={true} // 显示滚动条，让用户知道可以动
                        contentContainerStyle={{ paddingBottom: 40 }}
                        nestedScrollEnabled={true} // 增强嵌套手势兼容
                    >
                        {word.ai_meaning && (
                            <View style={styles.expertMeaningBox}>
                                <Text style={styles.expertMeaningLabel}>AI 核心释义</Text>
                                <Text style={styles.expertMeaningText}>{word.ai_meaning}</Text>
                            </View>
                        )}

                        <View style={styles.section}>
                            <View style={styles.row}>
                                <Text style={styles.label}>[ {word.breakdown || word.level} ]</Text>
                                <Text style={styles.meaning}>{word.translation}</Text>
                            </View>
                        </View>

                        {word.hanja_logic && (
                            <View style={styles.section}>
                                <Text style={styles.hanjaLabel}>深度解析</Text>
                                <Text style={styles.hanjaLogic}>{word.hanja_logic}</Text>
                            </View>
                        )}

                        {word.ai_mnemonic && (
                            <View style={styles.section}>
                                <Text style={styles.mnemonicLabel}>💡 趣味助记</Text>
                                <Text style={styles.mnemonicText}>{word.ai_mnemonic}</Text>
                            </View>
                        )}

                        {word.ai_usage && (
                            <View style={styles.section}>
                                <Text style={styles.usageLabel}>📖 用法辨析 & 搭配</Text>
                                <Text style={styles.usageText}>{word.ai_usage}</Text>
                            </View>
                        )}

                        <View style={styles.sentenceSection}>
                            <Text style={styles.sectionTitle}>语境例句</Text>
                            {word.sentences && word.sentences.length > 0 ? (
                                word.sentences.map((s, idx) => (
                                    <View key={idx} style={styles.sentenceItem}>
                                        <View style={styles.bullet} />
                                        <Text style={styles.sentenceText}>{s}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.hintText}>暂无例句，点击 AI 解析生成</Text>
                            )}
                        </View>
                    </ScrollView>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width * 0.9,
        height: screenHeight * 0.6,
        minHeight: 450,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressableContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wordTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    card: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        padding: 24,
    },
    frontCard: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    backCard: {
        backgroundColor: 'rgba(30,30,30,0.95)',
        alignItems: 'stretch',
    },
    hangul: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 2,
    },
    smallHangul: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    backHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 209, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 209, 255, 0.3)',
    },
    aiButtonText: {
        color: '#00D1FF',
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '600',
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        opacity: 0.6,
    },
    hintText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginLeft: 8,
    },
    backContent: {
        width: '100%',
        flex: 1,
    },
    expertMeaningBox: {
        backgroundColor: 'rgba(0, 209, 255, 0.15)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#00D1FF',
    },
    expertMeaningLabel: {
        color: '#00D1FF',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    expertMeaningText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 26,
    },
    section: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        color: '#00D1FF',
        fontSize: 14,
        marginRight: 12,
        fontWeight: '600',
    },
    meaning: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '500',
    },
    hanjaLabel: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    hanjaLogic: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        lineHeight: 22,
    },
    mnemonicLabel: {
        color: '#FF8C00', // 橙色
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    mnemonicText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        fontStyle: 'italic',
        lineHeight: 22,
    },
    usageLabel: {
        color: '#4EE24E', // 绿色
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    usageText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        lineHeight: 22,
    },
    sentenceSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 20,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    sentenceItem: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    bullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#00D1FF',
        marginTop: 8,
        marginRight: 10,
    },
    sentenceText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        lineHeight: 24,
        flex: 1,
    }
});
