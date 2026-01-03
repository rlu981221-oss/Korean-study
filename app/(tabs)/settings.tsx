import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWords } from '../../context/WordContext';
import { getBackupTTSUrl, getWebTTSUrl } from '../../src/lib/audio';

const BACKGROUND_COLORS = ['#2C3E50', '#000000'] as const;

export default function SettingsScreen() {
    const {
        dailyNewTarget,
        updateDailyNewTarget,
        addCustomWord,
        resetAllData,
        repairDatabase,
        fetchRemoteLibrary,
        words
    } = useWords();

    const testPlayer = useAudioPlayer('');
    const [testText, setTestText] = useState('');
    const [remoteUrl, setRemoteUrl] = useState('https://raw.githubusercontent.com/example/words.json');
    const [isUpdating, setIsUpdating] = useState(false);

    // AI API Key state
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    React.useEffect(() => {
        const loadApiKey = async () => {
            const saved = await AsyncStorage.getItem('GEMINI_API_KEY');
            if (saved) setApiKey(saved);
        };
        loadApiKey();
    }, []);

    const saveApiKey = async () => {
        await AsyncStorage.setItem('GEMINI_API_KEY', apiKey);
        Alert.alert('成功', 'API Key 已保存');
    };

    // Add Word Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [newCn, setNewCn] = useState('');

    const handleAddWord = async () => {
        if (!newWord || !newCn) {
            Alert.alert('提示', '请完整填写单词和中文释义');
            return;
        }
        await addCustomWord(newWord, newCn, 'B'); // Default level B
        setNewWord('');
        setNewCn('');
        setModalVisible(false);
        Alert.alert('成功', '单词已加入本地词库');
    };

    const handleSync = async () => {
        if (!remoteUrl.trim()) return;
        setIsUpdating(true);
        try {
            const count = await fetchRemoteLibrary(remoteUrl);
            Alert.alert('更新成功', `已成功加载 ${count} 个新词汇！`);
            setRemoteUrl('');
        } catch (e) {
            Alert.alert('更新失败', '无法拉取词库，请检查 URL 或网络连接。');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRepair = async () => {
        Alert.alert(
            '修复词库',
            '如果词库单词数量不正确或加载异常，可尝试此操作。这将重新从本地资源安装完整词库，您的学习记录将被保留。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确定修复',
                    style: 'default',
                    onPress: async () => {
                        await repairDatabase();
                        Alert.alert('成功', '词库已重装，请检查单词数');
                    }
                }
            ]
        );
    };

    const resetData = async () => {
        Alert.alert(
            '重置进度',
            '确定要删除所有学习记录吗？此操作不可撤销。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确定重置',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        resetAllData();
                        Alert.alert('成功', '所有数据已重置');
                    }
                }
            ]
        );
    };

    const testTTS = async () => {
        const textToSpeak = testText.trim() || '안녕하세요';
        const primaryUrl = getWebTTSUrl(textToSpeak);
        try {
            await testPlayer.replace(primaryUrl);
            testPlayer.seekTo(0);
            testPlayer.play();
        } catch (e) {
            const backupUrl = getBackupTTSUrl(textToSpeak);
            await testPlayer.replace(backupUrl);
            testPlayer.seekTo(0);
            testPlayer.play();
        }
    };

    return (
        <LinearGradient colors={BACKGROUND_COLORS} style={styles.background}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>应用设置</Text>
                        <View style={styles.versionBadge}>
                            <Text style={styles.versionLabel}>Pro v1.6.0</Text>
                        </View>
                    </View>

                    {/* 0. AI 配置 (新增) */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="bulb" size={20} color="#FFD700" />
                            <Text style={styles.sectionTitle}>AI 深度解析配置</Text>
                        </View>
                        <Text style={styles.hintText}>使用该功能需要配置您的 Gemini API Key</Text>

                        <View style={styles.apiInputWrapper}>
                            <TextInput
                                style={styles.apiInput}
                                placeholder="输入您的 Gemini API Key"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={apiKey}
                                onChangeText={setApiKey}
                                secureTextEntry={!showApiKey}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowApiKey(!showApiKey)}
                            >
                                <Ionicons
                                    name={showApiKey ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="rgba(255,255,255,0.5)"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { marginTop: 12, backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}
                            onPress={saveApiKey}
                        >
                            <Ionicons name="save-outline" size={18} color="#FFD700" />
                            <Text style={[styles.buttonText, { color: '#FFD700' }]}>保存 API Key</Text>
                        </TouchableOpacity>

                        <Text style={styles.footerHint}>
                            去 <Text style={{ color: '#00D1FF', textDecorationLine: 'underline' }}>aistudio.google.com</Text> 免费获取 Key
                        </Text>
                    </View>

                    {/* 1. 每日目标设置 (新功能) */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flag" size={20} color="#00D1FF" />
                            <Text style={styles.sectionTitle}>每日学习目标</Text>
                        </View>
                        <View style={styles.targetControl}>
                            <Text style={styles.targetValue}>{dailyNewTarget}</Text>
                            <Text style={styles.targetLabel}>每日新词</Text>
                        </View>
                        <View style={styles.targetButtons}>
                            {[10, 20, 30, 50, 100].map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.miniButton, dailyNewTarget === val && styles.miniButtonActive]}
                                    onPress={() => updateDailyNewTarget(val)}
                                >
                                    <Text style={[styles.miniButtonText, dailyNewTarget === val && styles.miniButtonTextActive]}>{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.hint}>设定后，今日任务将按此数量抓取新词。</Text>
                    </View>

                    {/* 2. 手动加词 (新功能) */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="add-circle" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>快速加词</Text>
                        </View>
                        <Text style={styles.voiceItem}>遇到的生词，可直接加入本地词库</Text>
                        <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: 'rgba(76, 175, 80, 0.2)' }]} onPress={() => setModalVisible(true)}>
                            <Ionicons name="create-outline" size={16} color="#4CAF50" />
                            <Text style={[styles.buttonText, { color: '#4CAF50' }]}>录入新单词</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 3. 统计状态 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="stats-chart" size={20} color="#FF9800" />
                            <Text style={styles.sectionTitle}>系统状态</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.voiceItem}>当前词库总量:</Text>
                            <Text style={styles.onlineBadgeText}>{words.length} 词</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.voiceItem}>数据库状态:</Text>
                            <Text style={styles.onlineBadgeText}>已就绪</Text>
                        </View>
                    </View>

                    {/* 原有的音频诊断 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="mic" size={20} color="#6dd5ed" />
                            <Text style={styles.sectionTitle}>语音发音测试</Text>
                        </View>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="输入单词测试 (如: 사과)"
                                placeholderTextColor="#666"
                                value={testText}
                                onChangeText={setTestText}
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={testTTS}>
                            <Ionicons name="play" size={16} color="#6dd5ed" />
                            <Text style={styles.buttonText}>测试发音</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 数据重置 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="trash" size={20} color="#F44336" />
                            <Text style={styles.sectionTitle}>数据管理</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.button, { marginBottom: 12, backgroundColor: 'rgba(0, 209, 255, 0.1)' }]}
                            onPress={handleRepair}
                        >
                            <Ionicons name="refresh-circle-outline" size={18} color="#00D1FF" />
                            <Text style={styles.buttonText}>修复/更新本地词库</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={resetData}>
                            <Ionicons name="trash-outline" size={18} color="#F44336" />
                            <Text style={styles.dangerButtonText}>清空所有进度</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.versionText}>Nora Korean Pro v1.5.0</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* 加词 Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>新词录入</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="韩语单词 (如: 노력)"
                            placeholderTextColor="#666"
                            value={newWord}
                            onChangeText={setNewWord}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="中文翻译 (如: 努力)"
                            placeholderTextColor="#666"
                            value={newCn}
                            onChangeText={setNewCn}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalBtnText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddWord}>
                                <Text style={styles.modalBtnText}>保存到词库</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1 },
    container: { padding: 20, paddingBottom: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    title: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
    versionBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    versionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
    section: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    sectionTitle: { color: '#00D1FF', fontSize: 18, fontWeight: 'bold' },
    targetControl: { alignItems: 'center', marginBottom: 15 },
    targetValue: { color: '#00D1FF', fontSize: 48, fontWeight: 'bold' },
    targetLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    targetButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    miniButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    miniButtonActive: { backgroundColor: '#00D1FF', borderColor: '#00D1FF' },
    miniButtonText: { color: '#888', fontSize: 14, fontWeight: '600' },
    miniButtonTextActive: { color: '#000' },
    button: {
        backgroundColor: 'rgba(0, 209, 255, 0.1)',
        padding: 15,
        borderRadius: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: { color: '#00D1FF', fontSize: 16, fontWeight: '600' },
    inputContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: { color: '#FFF', fontSize: 16, padding: 12 },
    voiceItem: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
    onlineBadgeText: { color: '#00D1FF', fontSize: 14, fontWeight: 'bold' },
    dangerButton: { backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: 'rgba(244, 67, 54, 0.2)', borderWidth: 1 },
    dangerButtonText: { color: '#F44336', fontSize: 16, fontWeight: '600' },
    hint: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 12 },
    hintText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 12 },
    footerHint: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 10, textAlign: 'center' },
    apiInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingRight: 10,
    },
    apiInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        padding: 12,
        fontFamily: 'monospace',
    },
    eyeIcon: {
        padding: 5,
    },
    footer: { marginTop: 40, alignItems: 'center' },
    versionText: { color: '#444', fontSize: 12 },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: '#000', color: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#333' },
    saveBtn: { backgroundColor: '#00D1FF' },
    modalBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
