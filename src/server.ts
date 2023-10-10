import rateLimit from "express-rate-limit";
import express, { Express, Request, Response } from "express";
import cors from "cors"

export default class RestServer {
    server: Express;
    port: number;

    constructor(port: number) {
        this.server = express();
        this.server.use(cors());
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