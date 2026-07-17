<script lang="ts" setup>
const { isRefreshing = false } = defineProps<{
  secondsRemaining: number | null
  isWarning: boolean
  isExpired: boolean
  isRefreshing?: boolean
}>()

const emit = defineEmits<{
    refresh: []
}>()

function handleRefresh() {
    if (isRefreshing) return
    emit('refresh')
}
</script>

<template>
    <div v-if="isWarning && !isExpired" class="session-warning">
        <span class="session-warning-text">
            La sesión expira en {{ secondsRemaining }} segundos — guarde su trabajo
        </span>
        <button
            class="btn-secondary btn-sm"
            type="button"
            :disabled="isRefreshing"
            @click="handleRefresh"
        >
            {{ isRefreshing ? 'Refrescando...' : 'Refrescar Sesión' }}
        </button>
    </div>
</template>

<style scoped>
.session-warning {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    z-index: 99;
    background: rgba(234, 88, 12, 0.15);
    border-bottom: 1px solid rgba(234, 88, 12, 0.3);
    color: #ea580c;
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    font-weight: 500;
    font-size: 0.9rem;
}

.session-warning-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
