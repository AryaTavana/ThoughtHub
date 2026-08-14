import {createContext} from 'react'

import type {NotificationItem} from './api/notifications'

export interface NotificationsContextValue {
    notifications: NotificationItem[]
    unreadCount: number
    isLoading: boolean
    error: string | null
    markRead: (notificationId: number) => Promise<void>
    markAllRead: () => Promise<void>
    refreshNotifications: () => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    markRead: async () => {},
    markAllRead: async () => {},
    refreshNotifications: async () => {},
})
