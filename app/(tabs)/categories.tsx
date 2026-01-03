import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Modal, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWords } from '../../context/WordContext';

import React, { useMemo, useState } from 'react';
import WordDetailModal from '../../components/WordDetailModal';
import { WordWithSRS } from '../../context/WordContext';

const BACKGROUND_COLORS = ['#2C3E50', '#000000'] as const;

// 1. 图标映射表
const CATEGORY_ICONS: Record<string, any> = {
    '生活': 'cafe-outline',
    '职场': 'briefcase-outline',
    '情感': 'heart-outline',
    '社会': 'people-outline',
    '经济': 'trending-up-outline',
    '政治': 'globe-outline',
    '文化': 'color-palette-outline',
    '科技': 'hardware-chip-outline',
    '自然': 'leaf-outline',
    '医学': 'medkit-outline',
    '历史': 'hourglass-outline',
    '抽象': 'cube-outline',
    '未分类': 'help-circle-outline'
};

export default function CategoriesScreen() {
    const { words } = useWords();

    // 状态管理
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [detailWord, setDetailWord] = useState<WordWithSRS | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 2. 数据聚合：统计每个分类的单词
    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        words.forEach(w => {
            const cat = w.category || '未分类';
            // 处理可能有多个分类的情况 "生活, 情感"
            const cats = cat.split(/[,，]/).map(c => c.trim());
            cats.forEach(c => {
                const standardizedCat = CATEGORY_ICONS[c] ? c : '其他';
                // 暂时只统计主分类，或者全部归纳
                // 简单起见，如果不在映射表中，统一归为“未分类”或者原样显示
                // 这里为了对齐我们的 12 大类，我们优先匹配 map keys
                let matched = Object.keys(CATEGORY_ICONS).find(k => c.includes(k));
                const finalCat = matched || c || '未分类';

                stats[finalCat] = (stats[finalCat] || 0) + 1;
            });
        });
        // 过滤掉数量为0的（不应该有）
        return Object.entries(stats).sort((a, b) => b[1] - a[1]); // 按数量降序
    }, [words]);

    // 获取当前选中分类的单词列表 (带搜索过滤)
    const selectedWords = useMemo(() => {
        if (!selectedCategory) return [];

        let filtered = words.filter(w => {
            const cat = w.category || '未分类';
            return cat.includes(selectedCategory);
        });

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(w =>
                w.word.toLowerCase().includes(q) ||
                w.translation.toLowerCase().includes(q) ||
                (w.ai_meaning && w.ai_meaning.toLowerCase().includes(q))
            );
        }

        return filtered;
    }, [words, selectedCategory, searchQuery]);

    const handleSelectCategory = (cat: string) => {
        setSelectedCategory(cat);
        setSearchQuery(''); // 重置搜索
    };

    const renderCategoryCard = ({ item }: { item: [string, number] }) => {
        const [category, count] = item;
        const iconName = CATEGORY_ICONS[category] || 'folder-open-outline';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelectCategory(category)}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name={iconName} size={32} color="#FFF" />
                </View>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.count}>{count} 个单词</Text>
            </TouchableOpacity>
        );
    };

    const renderWordItem = ({ item }: { item: WordWithSRS }) => (
        <TouchableOpacity
            style={styles.wordItem}
            onPress={() => setDetailWord(item)}
        >
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.wordText}>{item.word}</Text>
                {item.ai_meaning ? (
                    <Text style={[styles.wordMeaning, { color: '#00D1FF' }]} numberOfLines={2}>
                        ✨ {item.ai_meaning}
                    </Text>
                ) : (
                    <Text style={styles.wordMeaning} numberOfLines={1}>{item.translation}</Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.headerTitle}>分类</Text>
                <FlatList
                    data={categoryStats}
                    keyExtractor={(item) => item[0]}
                    renderItem={renderCategoryCard}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />

                {/* 分类详情 Modal */}
                <Modal
                    visible={!!selectedCategory}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedCategory(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selectedCategory}</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* 分类内搜索栏 */}
                        <View style={styles.searchBarContainer}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={`在"${selectedCategory}"中搜索...`}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    clearButtonMode="while-editing"
                                />
                            </View>
                        </View>

                        <FlatList
                            data={selectedWords}
                            keyExtractor={item => item.id.toString()}
                            renderItem={renderWordItem}
                            contentContainerStyle={styles.wordListContent}
                        />
                    </View>
                </Modal>

                {/* 单词详情 Modal (复用) */}
                <WordDetailModal
                    visible={!!detailWord}
                    word={detailWord}
                    onClose={() => setDetailWord(null)}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 20,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 10,
    },
    listContent: {
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        width: '48%',
        aspectRatio: 1, // Square cards
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconContainer: {
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 10,
        borderRadius: 50,
    },
    categoryName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
        textAlign: 'center',
    },
    count: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#1E293B',
    },
    searchBarContainer: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        marginLeft: 8,
    },
    backButton: {
        padding: 5,
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    wordListContent: {
        padding: 20,
    },
    wordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
        padding: 16,
        borderRadius: 12,
    },
    wordText: {
        fontSize: 18,
        color: '#FFF',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    wordMeaning: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
});
