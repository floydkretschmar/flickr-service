import { Request, Response } from "express";
import { Photo, PhotoResult, PhotoService } from "./photoService.js";

export type GetPhotoRequestDictionary = { albumId: string };
export type GetPhotoRequestBody = {};
export type GetPhotoRequestQuery = { page?: number; limit?: number };
export type GetPhotoResponseBody = {
  page: number;
  limit: number;
  data: Array<Photo>;
  totalPages: number;
};

export const getPicturesController = async (
  photoService: PhotoService,
  request: Request<
    GetPhotoRequestDictionary,
    GetPhotoResponseBody,
    GetPhotoRequestBody,
    GetPhotoRequestQuery
  >,
  response: Response<GetPhotoResponseBody>,
): Promise<void> => {
  const page = request.query.page ?? 1;
  const limit = request.query.limit ?? 10;

  if (page < 1) {
    response.statusMessage = "Page index has to be 1 or larger";
    response.status(422).end();
    return;
  }

  try {
    const result: PhotoResult = await photoService.getPhotos(
      request.params.albumId,
      page,
      limit,
    );

    if (result.photos.length > 0) {
      const res = {
        data: result.photos,
        limit: limit,
        page: page,
        totalPages: result.totalPages,
      } as GetPhotoResponseBody;
      response.send(res);
      return;
    }

    response.statusMessage = "No results found for this page";
    response.status(404).end();
  } catch (error) {
    response.statusMessage = "An error occurred while fetching the photos";
    console.log(error);
    response.status(500).end();
  }
};
