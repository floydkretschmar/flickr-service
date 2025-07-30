import rateLimit from "express-rate-limit";
import { Express, Request, Response } from "express";
import cors from "cors";

export default class Server {
  server: Express;

  constructor(server: Express) {
    this.server = server;
  }

  public get<TReqDictionary, TReqBody, TReqQuery, TResBody>(
    path: string,
    requestHandler: (
      request: Request<TReqDictionary, TReqBody, TReqQuery, TResBody>,
      response: Response,
    ) => void,
    requestsPerMinute: number = 100,
  ): void {
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      limit: requestsPerMinute,
    });
    this.server.use(path, limiter);
    this.server.get(path, requestHandler);
  }

  public start(port: number) {
    this.server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }

  public configureCORS(allowedOrigins: Array<string>): void {
    const corsOptions = {
      origin: (
        origin: any,
        callback: (err: Error | null, origin?: any) => void,
      ): void => {
        if (
          allowedOrigins.indexOf(origin) !== -1 ||
          allowedOrigins.includes("*") ||
          !origin
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    };

    this.server.use(cors(corsOptions));
    this.server.set("trust proxy", 1);
  }
}
