
import axios, { AxiosResponse } from 'axios';

export type FlickrResponse = { stat: string, photoset: FlickrPhotoset }
export type FlickrPhotoset = { photo: Array<FlickrPhoto>, pages: number }
export type FlickrPhoto = {
    id: string, title: string, datetaken: string, ownername: string, views: string, url_l: string, height_l: number, width_l: number, url_o: string, height_o: number, width_o: number;
}

export default class FlickrApiService {
    private apiKey: string;
    private apiUrl: string;

    constructor(apiKey: string, apiUrl: string) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
     }

    async fetchPhotosFromAlbum(albumId: string, pageNumber: number, pageCount: number): Promise<AxiosResponse<FlickrResponse>> {
        return await axios({
            method: 'get',
            url: this.apiUrl,
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