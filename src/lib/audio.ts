import * as Audio from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * 联网发音源：
 */
export const getWebTTSUrl = (word: string) =>
    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&le=ko`;

export const getBackupTTSUrl = (word: string) =>
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=ko&client=tw-ob`;

const getAudioUrls = (word: string) => [
    getWebTTSUrl(word),
    getBackupTTSUrl(word)
];

const getCacheDir = () => {
    const cacheDir = (FileSystem as any).cacheDirectory;
    return cacheDir ? `${cacheDir}audio_cache/` : null;
};

// 使用全局唯一的播放器实例，避免频繁创建销毁
let globalPlayer: Audio.AudioPlayer | null = null;

export async function playWordAudio(word: string) {
    const cacheDir = getCacheDir();
    const urls = getAudioUrls(word);
    const localUri = cacheDir ? `${cacheDir}${encodeURIComponent(word)}.mp3` : null;
    let uriToPlay: string = urls[0];

    // 1. 缓存校验
    if (localUri) {
        try {
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (fileInfo.exists) {
                uriToPlay = localUri;
                console.log(`[Audio] Cache hit: ${word}`);
            } else {
                console.log(`[Audio] Cache miss: ${word}. Fetching...`);
                // 确保父目录存在
                const dirInfo = await FileSystem.getInfoAsync(cacheDir!);
                if (!dirInfo.exists) {
                    await FileSystem.makeDirectoryAsync(cacheDir!, { intermediates: true });
                }
                // 后台下载
                FileSystem.downloadAsync(urls[0], localUri).then(res => {
                    console.log(`[Audio] Successfully cached: ${word} to ${res.uri}`);
                }).catch(e => console.warn("Cache fail", e));
            }
        } catch (e) {
            console.warn("[Audio] Cache logic error", e);
        }
    }

    // 2. 播放执行 (重用 Player)
    try {
        if (!globalPlayer) {
            globalPlayer = Audio.createAudioPlayer(uriToPlay);
        } else {
            // 如果已经在播，可以先停止或者直接换源
            globalPlayer.replace(uriToPlay);
        }

        // 兼容处理：确保从头播放
        globalPlayer.play();
    } catch (error) {
        console.error("[Audio] Play error, trying backup...", error);
        // 如果主源跪了，强行切备用源
        if (globalPlayer) {
            globalPlayer.replace(urls[1]);
            globalPlayer.play();
        }
    }
}
