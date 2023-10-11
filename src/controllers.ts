import { Request, Response } from 'express';
import FlickrApiService, { FlickrPhoto } from './apiService';
import moment from 'moment';

export type GetPhotoRequestDictionary = { albumId: string }
export type GetPhotoRequestBody = {}
export type GetPhotoRequestQuery = { page?: number, limit?: number }
export type GetPhotoResponseBody = { page: number, limit: number, data: Array<Photo> }

export interface Photo { id: string, title: string, dateWhenTaken: string, owner: string, views: number, thumbnail: Image, picture: Image }
export interface Image { url: string, width: number, height: number }

export const getPicturesController = async (request: Request<GetPhotoRequestDictionary, GetPhotoResponseBody, GetPhotoRequestBody, GetPhotoRequestQuery>, response: Response<GetPhotoResponseBody>): Promise<void> => {
    const apiService = new FlickrApiService(process.env.FLICKR_API_KEY, process.env.FLICKR_BASE_URL);
    const page = request.query.page ?? 1;
    const limit = request.query.limit ?? 10;

    const flickrResponse = await apiService.fetchPhotosFromAlbum(request.params.albumId, page, limit)
    const mappedImages = flickrResponse.data.photoset.photo.map((p: FlickrPhoto) => ({
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
    response.send({
      data: mappedImages,
      limit: limit,
      page: page
    })};