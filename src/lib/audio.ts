import * as Audio from 'expo-audio';
import * as FileSystem from 'expo-file-system';

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
    // @ts-ignore
    return FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}audio_cache/` : null;
};

export async function playWordAudio(word: string) {
    const cacheDir = getCacheDir();
    const urls = getAudioUrls(word);
    const localUri = cacheDir ? `${cacheDir}${encodeURIComponent(word)}.mp3` : null;
    let uriToPlay: string = urls[0];

    // 1. 缓存优先校验
    if (localUri) {
        try {
            // 确保目录存在
            const dirInfo = await FileSystem.getInfoAsync(cacheDir!);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(cacheDir!, { intermediates: true });
            }

            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (fileInfo.exists) {
                // 本地存在，直接播本地，速度最快
                uriToPlay = localUri;
                console.log(`[Audio] Cache hit: ${word}`);
            } else {
                // 本地不存在，播放网络源，并同步开启静默下载
                console.log(`[Audio] Cache miss: ${word}. Playing from network and caching...`);
                // 静默下载存入本地
                FileSystem.downloadAsync(urls[0], localUri).catch(err => {
                    console.warn(`[Audio] Failed to cache ${word}:`, err);
                });
            }
        } catch (e) {
            console.warn("[Audio] Cache logic failed, falling back to network:", e);
        }
    }

    // 2. 执行播放
    try {
        const player = Audio.createAudioPlayer(uriToPlay);
        player.play();
    } catch (error) {
        console.error("[Audio] Primary source failed, attempting fallback...");
        try {
            const fallbackPlayer = Audio.createAudioPlayer(urls[1]);
            fallbackPlayer.play();
        } catch (err2) {
            console.error("[Audio] All audio sources failed.");
        }
    }
}
