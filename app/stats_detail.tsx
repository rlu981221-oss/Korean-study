import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWords } from '../context/WordContext';
import { loadUserStats, UserStats } from '../src/lib/storage';

const { width } = Dimensions.get('window');
const BACKGROUND_COLORS = ['#1a2a6c', '#b21f1f', '#fdbb2d'] as const; // Deep learning gradient

export default function StatsDetailScreen() {
    const router = useRouter();
    const { words } = useWords();
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        loadUserStats().then(setStats);
    }, []);

    if (!stats) return null;

    // Calculate Week Data
    const weekData = [];
    const today = new Date();
    const maxVal = 20; // Default max for graph scale
    let weeklyMax = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = stats.history?.[dateStr] || 0;
        if (count > weeklyMax) weeklyMax = count;

        const dayLabel = i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`;
        weekData.push({ label: dayLabel, value: count });
    }

    const graphMax = Math.max(weeklyMax, 5); // Ensure at least some height

    // Calculate Mastery Distribution
    const totalWords = words.length;
    const mastered = words.filter(w => w.reviewItem.isMastered || w.reviewItem.interval >= 21).length;
    const learning = words.filter(w => w.reviewItem.interval > 0 && w.reviewItem.interval < 21).length;
    const newWords = words.filter(w => w.reviewItem.interval === 0).length;
    const weak = words.filter(w => (w.reviewItem as any).isWeak).length;

    return (
        <LinearGradient colors={['#0F2027', '#203A43', '#2C5364']} style={styles.background}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>学习数据洞察</Text>
                    </View>

                    {/* Summary Cards */}
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{stats.streak}🔥</Text>
                            <Text style={styles.summaryLabel}>连续打卡</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{stats.totalReviews}</Text>
                            <Text style={styles.summaryLabel}>累计复习</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryValue}>{mastered}</Text>
                            <Text style={styles.summaryLabel}>已掌握</Text>
                        </View>
                    </View>

                    {/* Weak Words Alert */}
                    {weak > 0 && (
                        <View style={styles.weakAlert}>
                            <Ionicons name="warning" size={20} color="#FF9800" />
                            <Text style={styles.weakText}>您有 {weak} 个薄弱单词需要加强复习</Text>
                            <TouchableOpacity style={styles.weakBtn} onPress={() => router.push('/(tabs)/library')}>
                                <Text style={styles.weakBtnText}>去复习</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Weekly Trend Chart (Custom Bar Chart) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>近7天复习趋势</Text>
                        <View style={styles.chartContainer}>
                            {weekData.map((d, index) => {
                                const heightPercent = (d.value / graphMax) * 100;
                                return (
                                    <View key={index} style={styles.barGroup}>
                                        <View style={styles.barTrack}>
                                            <LinearGradient
                                                colors={['#4facfe', '#00f2fe']}
                                                style={[styles.bar, { height: `${heightPercent}%` }]}
                                            />
                                        </View>
                                        <Text style={styles.barLabel}>{d.label}</Text>
                                        <Text style={styles.barValue}>{d.value > 0 ? d.value : ''}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Mastery Distribution */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>词汇掌握度分布</Text>
                        <View style={styles.distributionContainer}>
                            <DistributionRow label="已掌握 (Mastered)" count={mastered} total={totalWords} color="#4CAF50" />
                            <DistributionRow label="学习中 (Learning)" count={learning} total={totalWords} color="#03A9F4" />
                            <DistributionRow label="新词汇 (New)" count={newWords} total={totalWords} color="#9E9E9E" />
                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const DistributionRow = ({ label, count, total, color }: { label: string, count: number, total: number, color: string }) => {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <View style={styles.distRow}>
            <View style={styles.distHeader}>
                <Text style={styles.distLabel}>{label}</Text>
                <Text style={styles.distCount}>{count} / {total}</Text>
            </View>
            <View style={styles.distTrack}>
                <View style={[styles.distFill, { width: `${percent}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1 },
    container: { padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backButton: { marginRight: 15, padding: 5 },
    title: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    summaryCard: { backgroundColor: 'rgba(255,255,255,0.1)', flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 12, alignItems: 'center' },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
    summaryLabel: { color: '#AAA', fontSize: 12 },

    section: { marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 20 },
    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },

    // Bar Chart
    chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 150, alignItems: 'flex-end', paddingBottom: 20 },
    barGroup: { alignItems: 'center', flex: 1 },
    barTrack: { height: 120, width: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, justifyContent: 'flex-end', marginBottom: 5 },
    bar: { width: '100%', borderRadius: 4 },
    barLabel: { color: '#888', fontSize: 10 },
    barValue: { position: 'absolute', top: -15, color: '#FFF', fontSize: 10 },

    // Distribution
    distributionContainer: { gap: 15 },
    distRow: { marginBottom: 5 },
    distHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    distLabel: { color: '#CCC', fontSize: 14 },
    distCount: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    distTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    distFill: { height: '100%', borderRadius: 4 },

    weakAlert: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 152, 0, 0.15)',
        padding: 12, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255, 152, 0, 0.3)'
    },
    weakText: { color: '#FFB74D', flex: 1, marginLeft: 10, fontSize: 14 },
    weakBtn: { backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    weakBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
