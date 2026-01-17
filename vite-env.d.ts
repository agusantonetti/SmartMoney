/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Removed reference to vite/client to fix "Cannot find type definition file" error

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
