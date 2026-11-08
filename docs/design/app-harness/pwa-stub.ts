// В живых экранах карты сервис-воркер не нужен: заглушка вместо virtual:pwa-register/react.
export function useRegisterSW() {
  return { needRefresh: [false, () => {}] as const, offlineReady: [false, () => {}] as const, updateServiceWorker: async () => {} }
}
