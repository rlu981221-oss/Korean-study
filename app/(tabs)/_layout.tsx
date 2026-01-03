import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#000000',
                    borderTopWidth: 0,
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    right: 20,
                    borderRadius: 25,
                    height: 60,
                    paddingBottom: 0, // 去除默认底部内边距
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 5,
                    },
                    shadowOpacity: 0.34,
                    shadowRadius: 6.27,
                    elevation: 10,
                },
                tabBarActiveTintColor: '#6dd5ed',
                tabBarInactiveTintColor: '#555',
                tabBarShowLabel: false, // 隐藏文字，只显示图标更简洁
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: '复习',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            top: focused ? -10 : 0, // 选中时上浮效果
                            backgroundColor: focused ? '#1a1a1a' : 'transparent',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                        }}>
                            <Ionicons name={focused ? "copy" : "copy-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: '词库',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            top: focused ? -10 : 0,
                            backgroundColor: focused ? '#1a1a1a' : 'transparent',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                        }}>
                            <Ionicons name={focused ? "library" : "library-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: '设置',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            top: focused ? -10 : 0,
                            backgroundColor: focused ? '#1a1a1a' : 'transparent',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                        }}>
                            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
