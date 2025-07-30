import { FlickrPhoto, FlickrResponse, FlickrService } from "./flickrService";
import moment from "moment/moment";

export interface Photo {
  id: string;
  title: string;
  dateWhenTaken: string;
  owner: string;
  views: number;
  thumbnail: Image;
  picture: Image;
}
export interface Image {
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

  constructor(flickrService: FlickrService) {
    this.flickrService = flickrService;
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
      photos = flickrResponse.photoset.photo.map(
        (p: FlickrPhoto) =>
          ({
            id: p.id,
            dateWhenTaken: moment(p.datetaken).format("Do MMMM YYYY"),
            owner: p.ownername,
            title: p.title,
            views: parseInt(p.views),
            picture: {
              height: p.height_l,
              width: p.width_l,
              url: p.url_l,
            } as Image,
            thumbnail: {
              height: p.height_m,
              width: p.width_m,
              url: p.url_m,
            } as Image,
          }) as Photo,
      );

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
}
