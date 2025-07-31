import { FlickrPhoto, FlickrService } from "./flickrService.js";

import moment from "moment";

export interface Photo {
  id: string;
  title: string;
  dateWhenTaken: string;
  owner: string;
  views: number;
  thumbnail: Thumbnail;
  picture: Image;
}
export interface Image {
  url: string;
  fallback: string;
}
export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}
export interface PhotoResult {
  photos: Photo[];
  totalPages: number;
}

export class PhotoService {
  private readonly flickrService: FlickrService;
  private readonly bucketBaseUrl: string;

  constructor(flickrService: FlickrService, bucketBaseUrl: string) {
    this.flickrService = flickrService;
    this.bucketBaseUrl = bucketBaseUrl;
  }

  public async getPhotos(
    albumId: string,
    page: number,
    numberOfImages: number,
  ): Promise<PhotoResult> {
    const flickrResponse = await this.flickrService.fetchPhotosFromAlbum(
      albumId,
      page,
      numberOfImages,
    );

    let photos: Photo[] = [];
    if (flickrResponse.stat === "ok") {
      photos = flickrResponse.photoset.photo.map((p: FlickrPhoto) => {
        const fullResolutionUrl = this.getFullResolutionUrl(p.title, p.id);
        return {
          id: p.id,
          dateWhenTaken: moment(p.datetaken).format("Do MMMM YYYY"),
          owner: p.ownername,
          title: p.title,
          views: parseInt(p.views),
          picture: {
            url: fullResolutionUrl,
            fallback: p.url_l,
          } as Image,
          thumbnail: {
            height: p.height_m,
            width: p.width_m,
            url: p.url_m,
          } as Thumbnail,
        } as Photo;
      });

      return {
        photos: photos,
        totalPages: flickrResponse.photoset.pages,
      } as PhotoResult;
    }

    return {
      photos: [],
      totalPages: -1,
    } as PhotoResult;
  }

  private getFullResolutionUrl(title: string, id: string) {
    const titleWithoutSpecialCharacters: string = title
      .toLowerCase()
      .replaceAll(/[`\s~!@#$%^&*_|+\-=?;:",.<>\{\}\[\]\\\/]+/gi, "-");
    const titlePart: string = titleWithoutSpecialCharacters.replaceAll(
      /[äöü'()]+/gi,
      "",
    );
    console.log(titlePart);
    return `${this.bucketBaseUrl}/${titlePart}_${id}_o.jpg`;
  }
}
