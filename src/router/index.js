import {createRouter, createWebHistory } from 'vue-router'
const Router = [
    {
        path: '/index',
        name: 'index',
        component: () => import('@/pages/index.vue')
    },
    {
        path: '/',
        redirect: '/index'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes: Router
})

export default router