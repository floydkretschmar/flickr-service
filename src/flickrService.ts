export type FlickrResponse = { stat: string; photoset: FlickrPhotoset };
export type FlickrPhotoset = { photo: Array<FlickrPhoto>; pages: number };
export type FlickrPhoto = {
  id: string;
  title: string;
  datetaken: string;
  ownername: string;
  views: string;
  url_l: string;
  height_l: number;
  width_l: number;
  url_m: string;
  height_m: number;
  width_m: number;
};

export class FlickrService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async fetchPhotosFromAlbum(
    albumId: string,
    pageNumber: number,
    pageCount: number,
  ): Promise<FlickrResponse> {
    const result = await fetch(
      `${this.apiUrl}?method=flickr.photosets.getPhotos&api_key=${this.apiKey}&photoset_id=${albumId}&extras=url_l,url_m,owner_name,date_taken,views&page=${pageNumber}&format=json&nojsoncallback=1&per_page=${pageCount}`,
    );
    return await result.json();
  }
}
