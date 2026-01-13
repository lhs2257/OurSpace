self.addEventListener('push', function (event) {
    if (!event.data) return

    try {
        const data = event.data.json()
        const title = data.title || 'OurSpace 알림'
        const options = {
            body: data.body,
            icon: '/icon-192x192.png', // iOS sometimes fails with absolute paths or missing icons
            badge: '/icon-192x192.png',
            data: {
                url: data.url || '/'
            }
        }

        event.waitUntil(
            self.registration.showNotification(title, options)
        )
    } catch (err) {
        console.error('Push notification error:', err)
    }
})

self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received.')
    event.notification.close()
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    )
})
