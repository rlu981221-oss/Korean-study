import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function HanjaBreakdown({ hanjaData }) {
    const [expanded, setExpanded] = useState(false);

    if (!hanjaData || hanjaData.length === 0) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.triggerButton}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.8}
            >
                <Text style={styles.triggerText}>
                    {expanded ? '▲ 收起词源 (Hanja)' : '▼ 查看词源 (Hanja)'}
                </Text>
            </TouchableOpacity>

            {expanded && (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.content}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                        {hanjaData.map((item, index) => (
                            <View key={index} style={styles.hanjaCard}>
                                <View style={styles.header}>
                                    <Text style={styles.char}>{item.char}</Text>
                                    <Text style={styles.arrow}>→</Text>
                                    <Text style={styles.origin}>{item.origin}</Text>
                                </View>
                                <Text style={styles.meaning}>{item.meaning}</Text>
                                <View style={styles.divider} />
                                <Text style={styles.relatedLabel}>同根词：</Text>
                                {item.related.map((word, idx) => (
                                    <Text key={idx} style={styles.relatedWord}>• {word}</Text>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    triggerButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 10,
    },
    triggerText: {
        color: '#E0E0E0',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        width: '100%',
        height: 160,
    },
    scroll: {
        paddingHorizontal: 10,
    },
    hanjaCard: {
        backgroundColor: 'rgba(30, 30, 30, 0.85)',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        width: 140,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    char: {
        fontSize: 24,
        color: '#FFF',
        fontWeight: 'bold',
    },
    arrow: {
        color: '#888',
        marginHorizontal: 8,
    },
    origin: {
        fontSize: 24,
        color: '#FFD700', // Gold color for Hanja
        fontWeight: 'bold',
        fontFamily: 'serif',
    },
    meaning: {
        color: '#AAA',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 8,
    },
    relatedLabel: {
        color: '#888',
        fontSize: 11,
        marginBottom: 4,
    },
    relatedWord: {
        color: '#DDD',
        fontSize: 12,
        marginTop: 2,
    },
});
