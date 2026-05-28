/// <reference types="vite/client" />

// Tự định nghĩa các env var custom của project để TS biết về chúng.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
