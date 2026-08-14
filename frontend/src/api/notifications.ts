import {apiRequest} from './client'

export type NotificationKind =
    | 'new_comment'
    | 'post_removed'
    | 'comment_removed'

export interface NotificationItem {
    id: number
    kind: NotificationKind
    title: string
    message: string
    actor_username: string | null
    post_title: string | null
    post_slug: string | null
    target_url: string
    is_read: boolean
    created_at: string
}

export function getNotifications(): Promise<NotificationItem[]> {
    return apiRequest<NotificationItem[]>('/api/notifications/')
}

export function markNotificationRead(
    notificationId: number,
): Promise<NotificationItem> {
    return apiRequest<NotificationItem>(
        `/api/notifications/${notificationId}/`,
        {
            method: 'PATCH',
            body: JSON.stringify({is_read: true}),
        },
    )
}

export function markAllNotificationsRead(): Promise<{updated: number}> {
    return apiRequest<{updated: number}>(
        '/api/notifications/mark-all-read/',
        {method: 'POST'},
    )
}
