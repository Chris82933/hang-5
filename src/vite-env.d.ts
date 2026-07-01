/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Wake Lock API — not in all TS DOM lib versions.
interface WakeLockSentinel {
  released: boolean
  release(): Promise<void>
}
interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}
interface Navigator {
  wakeLock?: WakeLock
}
