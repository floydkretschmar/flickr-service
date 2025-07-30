declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      REQUESTS_PER_MINUTE: number;
      FLICKR_API_KEY: string;
      FLICKR_BASE_URL: string;
      ALLOWED_REQUEST_ORIGIN_URLS: Array<string>;
    }
  }
}

export {};
