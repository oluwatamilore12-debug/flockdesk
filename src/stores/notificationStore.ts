import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: (userId: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: (userId: string) => Promise<void>
  subscribe: (userId: string) => () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    const notifications = (data || []) as Notification[]
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
      loading: false,
    })
  },

  markAsRead: async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    )
    set({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length })
  },

  markAllAsRead: async (userId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    const notifications = get().notifications.map((n) => ({ ...n, is_read: true }))
    set({ notifications, unreadCount: 0 })
  },

  subscribe: (userId) => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new as Notification
          const notifications = [newNotif, ...get().notifications]
          set({ notifications, unreadCount: get().unreadCount + 1 })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))