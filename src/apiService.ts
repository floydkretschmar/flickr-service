
import axios, { AxiosResponse } from 'axios';

export type FlickrResponse = { stat: string, photoset: FlickrPhotoset }
export type FlickrPhotoset = { photo: Array<FlickrPhoto> }
export type FlickrPhoto = {
    id: string, title: string, datetaken: string, ownername: string, views: string, url_l: string, height_l: number, width_l: number, url_o: string, height_o: number, width_o: number;
}

export default class FlickrApiService {
    private static BASE_URL = "https://api.flickr.com/services/rest";
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
     }

    async fetchPhotosFromAlbum(albumId: string, pageNumber: number, pageCount: number): Promise<AxiosResponse<FlickrResponse>> {
        return await axios({
            method: 'get',
            url: FlickrApiService.BASE_URL,
            params: {
                method: 'flickr.photosets.getPhotos',
                api_key: this.apiKey,
                photoset_id: albumId,
                extras: 'url_l, url_o, owner_name, date_taken, views',
                page: pageNumber,
                format: 'json',
                nojsoncallback: 1,
                per_page: pageCount,
            }
        })
    }
}