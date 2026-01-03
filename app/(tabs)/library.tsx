import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WordDetailModal from '../../components/WordDetailModal';
import { useWords, WordWithSRS } from '../../context/WordContext';
import { playWordAudio } from '../../src/lib/audio';

const BACKGROUND_COLORS = ['#0F172A', '#000000'] as const;

export default function LibraryScreen() {
    const { words, toggleWordMark } = useWords();
    const [filter, setFilter] = useState<'All' | 'B' | 'C' | 'Important'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWord, setSelectedWord] = useState<WordWithSRS | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    const playSound = async (text: string) => {
        await playWordAudio(text);
    };

    const filteredWords = words.filter(word => {
        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                word.word.toLowerCase().includes(query) ||
                word.translation.toLowerCase().includes(query) ||
                (word.ai_meaning && word.ai_meaning.toLowerCase().includes(query));

            if (!matchesSearch) return false;
        }

        // 级别过滤
        if (filter === 'All') return true;
        if (filter === 'B') return word.level.toString() === 'B' || word.level.toString() === '4';
        if (filter === 'C') return word.level.toString() === 'C' || word.level.toString() === '5' || word.level.toString() === '6';
        if (filter === 'Important') return word.isImportant === true;
        return true;
    });

    const handleOpenDetail = (word: WordWithSRS) => {
        setSelectedWord(word);
        setDetailVisible(true);
    };

    const renderItem = ({ item }: { item: WordWithSRS }) => {
        const dueDate = new Date(item.reviewItem.dueDate);
        const now = new Date();
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let statusColor = '#00D1FF';
        let statusText = `${item.reviewItem.interval}天后复习`;

        if (item.reviewItem.repetition === 0) {
            statusText = '未开始';
            statusColor = 'rgba(255,255,255,0.3)';
        } else if (diffDays <= 0) {
            statusText = '待复习';
            statusColor = '#FF4B4B';
        }

        const isImportant = item.isImportant;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleOpenDetail(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.hangul}>{item.word}</Text>
                        <Text style={styles.levelTag}>Level {item.level}</Text>
                    </View>
                    <TouchableOpacity onPress={() => playSound(item.word)} hitSlop={15}>
                        <Ionicons name="volume-medium" size={24} color="#FFF" style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                </View>

                {/* 优先显示 AI 释义 */}
                {item.ai_meaning ? (
                    <Text style={[styles.meaning, { color: '#00D1FF' }]} numberOfLines={2}>
                        ✨ {item.ai_meaning}
                    </Text>
                ) : (
                    <Text style={styles.meaning} numberOfLines={1}>{item.translation}</Text>
                )}

                <View style={styles.footer}>
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                        <Text style={styles.badgeText}>{statusText}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => toggleWordMark(item.id)}
                        hitSlop={10}
                    >
                        <Ionicons
                            name={isImportant ? "star" : "star-outline"}
                            size={22}
                            color={isImportant ? "#FFD700" : "rgba(255,255,255,0.2)"}
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>词库资源</Text>

                    {/* 搜索栏 */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="搜索韩语或中文意译..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterContainer}
                    >
                        {(['All', 'B', 'C', 'Important'] as const).map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                                onPress={() => setFilter(f)}
                            >
                                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                    {f === 'All' ? '全部' : f === 'Important' ? '已收藏' : `TOPIK ${f}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredWords}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    windowSize={5}
                />

                <WordDetailModal
                    visible={detailVisible}
                    word={selectedWord}
                    onClose={() => setDetailVisible(false)}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1, paddingHorizontal: 20 },
    headerContainer: { marginBottom: 15, marginTop: 15 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        marginLeft: 8,
    },
    filterContainer: { flexDirection: 'row', gap: 10, paddingBottom: 5 },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterButtonActive: { backgroundColor: '#00D1FF', borderColor: '#00D1FF' },
    filterText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    filterTextActive: { color: '#000' },
    listContent: { paddingBottom: 100 },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    hangul: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
    levelTag: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    meaning: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 15 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
});
