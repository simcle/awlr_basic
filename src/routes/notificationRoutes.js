import { getAllNotifications, getUnreadCount, getUnreadNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "../controllers/NotificationController.js";

export default async function(fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/notification', getAllNotifications)
    fastify.get('/notification/unread', getUnreadNotifications)
    fastify.get('/notification/count', getUnreadCount)
    fastify.put('/notification/:id/read', markNotificationAsRead)
    fastify.put('/notification/read-all', markAllNotificationsAsRead)
}