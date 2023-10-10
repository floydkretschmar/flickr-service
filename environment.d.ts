declare global {
    namespace NodeJS {
      interface ProcessEnv {
        PORT: number;
        REQUESTS_PER_MINUTE: number;
        FLICKR_API_KEY: string;
      }
    }
  }

  export {}