import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

export default function ContextPlayer({ videoId, start, end }) {
    const [playing, setPlaying] = useState(false);
    const playerRef = useRef(null);

    const onStateChange = useCallback((state) => {
        if (state === 'ended') {
            setPlaying(false);
        }
    }, []);

    // 简单的循环逻辑：每秒检查一次进度 (实际生产中建议用 interval)
    // 这里为了演示简化处理，仅依靠 start 参数初始化
    // YoutubePlayer 的 initialPlayerParams 可以设置 start

    return (
        <View style={styles.container}>
            <View style={styles.videoWrapper}>
                <YoutubePlayer
                    ref={playerRef}
                    height={200}
                    width={320}
                    play={playing}
                    videoId={videoId}
                    initialPlayerParams={{
                        start: start,
                        end: end, // 有些情况下 API 支持 end，如果不支持需手动监听
                        controls: false, // 隐藏原生控件，专注于听
                        modestbranding: true,
                    }}
                    onChangeState={onStateChange}
                />
            </View>
            <View style={styles.captionContainer}>
                <Text style={styles.captionText}>🎬 原声例句</Text>
                <Text
                    style={styles.playButton}
                    onPress={() => setPlaying((prev) => !prev)}
                >
                    {playing ? '⏸ 暂停' : '▶ 播放片段'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        alignItems: 'center',
        width: '100%',
    },
    videoWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    captionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 320,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    captionText: {
        color: '#888',
        fontSize: 12,
    },
    playButton: {
        color: '#00BFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
