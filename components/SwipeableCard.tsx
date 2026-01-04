import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { Rating } from '../src/lib/srs';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

interface SwipeableCardProps {
    children: React.ReactNode;
    onRate: (rating: Rating) => void;
    enabled?: boolean;
}

export default function SwipeableCard({ children, onRate, enabled = true }: SwipeableCardProps) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotateZ = useSharedValue(0);

    const pan = Gesture.Pan()
        .activeOffsetX([-20, 20]) // 只有横向移动超过 20px 才视为 Swipe，否则不拦截垂直滚动
        .enabled(enabled)
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
            // 简单的旋转逻辑：移动越远转得越多
            rotateZ.value = interpolate(event.translationX, [-width, width], [-15, 15], Extrapolate.CLAMP);
        })
        .onEnd(() => {
            if (translateX.value > SWIPE_THRESHOLD) {
                // Right Swipe -> Good
                runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
                runOnJS(onRate)(Rating.Good);
                // 弹回原位
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                rotateZ.value = withSpring(0);
            } else if (translateX.value < -SWIPE_THRESHOLD) {
                // Left Swipe -> Again
                runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
                runOnJS(onRate)(Rating.Again);
                // 弹回原位
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                rotateZ.value = withSpring(0);
            } else {
                // Reset
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                rotateZ.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotateZ: `${rotateZ.value}deg` },
            ],
        };
    });

    // 遮罩层动画
    const likeOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, width / 4], [0, 1], Extrapolate.CLAMP),
    }));

    const nopeOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-width / 4, 0], [1, 0], Extrapolate.CLAMP),
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {children}

                {/* 右滑：绿色 (认识) */}
                <Animated.View style={[styles.overlay, styles.likeOverlay, likeOpacity]}>
                    <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                    <Text style={[styles.overlayText, { color: '#4CAF50' }]}>认识</Text>
                </Animated.View>

                {/* 左滑：红色 (忘记) */}
                <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOpacity]}>
                    <Ionicons name="close-circle" size={80} color="#FF5252" />
                    <Text style={[styles.overlayText, { color: '#FF5252' }]}>忘记</Text>
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', // 半透明背景增强对比
        borderRadius: 32,
    },
    likeOverlay: {
        // backgroundColor: 'rgba(76, 175, 80, 0.2)',
    },
    nopeOverlay: {
        // backgroundColor: 'rgba(255, 82, 82, 0.2)',
    },
    overlayText: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 10,
        borderWidth: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderColor: 'currentColor',
    },
});
