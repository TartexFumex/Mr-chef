/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse du relais public proposé par défaut (facultative, fournie par la CI). */
  readonly VITE_PUBLIC_RELAY_URL?: string
}
