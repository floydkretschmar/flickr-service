import { Request, Response } from 'express';
import apiService, { FlickrPhoto } from './apiService';
import moment from 'moment';

export type GetPhotoRequestDictionary = { albumId: string }
export type GetPhotoRequestBody = {}
export type GetPhotoRequestQuery = { page?: number, limit?: number }
export type GetPhotoResponseBody = { page: number, limit: number, data: Array<Photo>, totalPages: number }

export interface Photo { id: string, title: string, dateWhenTaken: string, owner: string, views: number, thumbnail: Image, picture: Image }
export interface Image { url: string, width: number, height: number }

export const getPicturesController = async (request: Request<GetPhotoRequestDictionary, GetPhotoResponseBody, GetPhotoRequestBody, GetPhotoRequestQuery>, response: Response<GetPhotoResponseBody>): Promise<void> => {
  const page = request.query.page ?? 1;
  const limit = request.query.limit ?? 10;

  try {
    const flickrResponse = await apiService.fetchPhotosFromAlbum(request.params.albumId, page, limit)

    if (flickrResponse.stat === "ok") {
      const mappedImages = flickrResponse.photoset.photo.map((p: FlickrPhoto) => ({
        id: p.id,
        dateWhenTaken: moment(p.datetaken).format("Do MMMM YYYY"),
        owner: p.ownername,
        title: p.title,
        views: parseInt(p.views),
        picture: {
          height: p.height_o,
          width: p.width_o,
          url: p.url_o
        } as Image,
        thumbnail: {
          height: p.height_l,
          width: p.width_l,
          url: p.url_l
        } as Image
      }) as Photo);

      const res = {
        data: mappedImages,
        limit: limit,
        page: page,
        totalPages: flickrResponse.photoset.pages
      } as GetPhotoResponseBody;
      response.send(res);
    }
    response.statusMessage = "No results found for this page."
    response.status(404).end();
  }
  catch (error) {
    response.statusMessage = "An error occurred while fetching the photos."
    response.status(500).end();
  }
};