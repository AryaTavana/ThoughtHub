import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'

import {getApiErrorMessage} from './api/errors'
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationItem,
} from './api/notifications'
import {useAuth} from './auth/useAuth'
import {
    NotificationsContext,
    type NotificationsContextValue,
} from './notifications-context'

interface NotificationsProviderProps {
    children: ReactNode
}

export function NotificationsProvider({children}: NotificationsProviderProps) {
    const {isAuthenticated, isInitializing, user} = useAuth()
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refreshNotifications = useCallback(async () => {
        if (!isAuthenticated) {
            setNotifications([])
            setError(null)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            setNotifications(await getNotifications())
        } catch (loadError) {
            setError(
                getApiErrorMessage(
                    loadError,
                    'Unable to load notifications.',
                ),
            )
        } finally {
            setIsLoading(false)
        }
    }, [isAuthenticated])

    useEffect(() => {
        if (isInitializing) {
            return
        }

        let cancelled = false

        async function loadNotifications() {
            if (!isAuthenticated) {
                if (!cancelled) {
                    setNotifications([])
                    setError(null)
                }
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await getNotifications()
                if (!cancelled) {
                    setNotifications(response)
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        getApiErrorMessage(
                            loadError,
                            'Unable to load notifications.',
                        ),
                    )
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadNotifications()

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, isInitializing, user?.id])

    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.is_read).length,
        [notifications],
    )

    async function markRead(notificationId: number) {
        const current = notifications.find(
            (item) => item.id === notificationId,
        )
        if (!current || current.is_read) {
            return
        }

        const updated = await markNotificationRead(notificationId)
        setNotifications((items) =>
            items.map((item) =>
                item.id === notificationId ? updated : item,
            ),
        )
    }

    async function markAllRead() {
        if (unreadCount === 0) {
            return
        }

        await markAllNotificationsRead()
        setNotifications((items) =>
            items.map((item) => ({...item, is_read: true})),
        )
    }

    const contextValue: NotificationsContextValue = {
        notifications,
        unreadCount,
        isLoading,
        error,
        markRead,
        markAllRead,
        refreshNotifications,
    }

    return (
        <NotificationsContext.Provider value={contextValue}>
            {children}
        </NotificationsContext.Provider>
    )
}
