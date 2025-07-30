import dotenv from "dotenv";
import Server from "./server";
import {
  GetPhotoRequestBody,
  GetPhotoRequestDictionary,
  GetPhotoRequestQuery,
  GetPhotoResponseBody,
  getPicturesController,
} from "./controllers";
import { PhotoService } from "./photoService";
import { FlickrService } from "./flickrService";
import express, { Request, Response } from "express";

dotenv.config();

const server = new Server(express());
const flickrService = new FlickrService(
  process.env.FLICKR_API_KEY,
  process.env.FLICKR_BASE_URL,
);
const photoService = new PhotoService(flickrService);

server.configureCORS(process.env.ALLOWED_REQUEST_ORIGIN_URLS);
server.get(
  "/photos/:albumId",
  (
    request: Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    >,
    response: Response<GetPhotoResponseBody>,
  ) => getPicturesController(photoService, request, response),
  process.env.REQUESTS_PER_MINUTE,
);
server.start(process.env.PORT);
