import rateLimit from "express-rate-limit";
import express, { Express, Request, Response } from "express";
import cors from "cors"

export default class RestServer {
    server: Express;
    port: number;

    constructor(port: number, allowedOriginUrls: Array<string>) {
        this.server = express();
        var corsOptions = {
            origin: (origin: any, callback: (err: Error | null, origin?: any) => void): void => {
              if (allowedOriginUrls.indexOf(origin) !== -1) {
                callback(null, true)
              } else {
                callback(new Error('Not allowed by CORS'))
              }
            }
          }

        this.server.use(cors(corsOptions));
        this.port = port;
    }
    
    public get<TReqDictionary, TReqBody, TReqQuery, TResBody>(
        path: string,
        requestHandler: (request: Request<TReqDictionary, TReqBody, TReqQuery, TResBody>, response: Response) => void, 
        requestsPerMinute: number = 100): void {
        const limiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: requestsPerMinute, // 10 requests per minute
          });
        this.server.use(path, limiter);
        this.server.get(path, requestHandler);
    }

    public start() {
        this.server.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        })
    }
}