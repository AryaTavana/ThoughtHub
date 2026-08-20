import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production assets are collected by Django under /static/frontend/. Keep the
// development base at / so the existing Vite workflow remains unchanged.
export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/static/frontend/' : '/',
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:8000',
            '/media': 'http://127.0.0.1:8000',
            '/admin': 'http://127.0.0.1:8000',
            '/static': 'http://127.0.0.1:8000',
        },
    },
}))
