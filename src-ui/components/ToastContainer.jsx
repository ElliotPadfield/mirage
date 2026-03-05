import React from 'react'
import { motion } from 'motion/react'

function ToastContainer({ notifications, onDismiss }) {
  return (
    <div className="toast-container">
      {notifications.slice(0, 3).map((notification) => (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="toast"
          role="alert"
          aria-live="polite"
        >
          <div className={`toast-icon ${
            notification.type === 'error' ? 'toast-icon-error' :
            notification.type === 'success' ? 'toast-icon-success' : 'toast-icon-info'
          }`}>
            {notification.type === 'error' ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : notification.type === 'success' ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="toast-content">
            <div className="toast-title">{notification.title}</div>
            {notification.message && (
              <div className="toast-message">{notification.message}</div>
            )}
          </div>
          <button
            onClick={() => onDismiss(notification.id)}
            className="toast-close"
            aria-label="Dismiss notification"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      ))}
    </div>
  )
}

export default ToastContainer
