import { afterEach, describe, expect, it, vi } from "vitest";
import { FlickrResponse, FlickrService } from "../flickrService";
import { Image, Photo, PhotoService } from "../photoService";
import moment from "moment";

describe("Photo service", () => {
  const fetchPhotosFromAlbum = vi.fn();
  const flickrService: Partial<FlickrService> = {
    fetchPhotosFromAlbum: fetchPhotosFromAlbum,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should return formatted photo result if flickr api returns success", async () => {
    const photoService: PhotoService = new PhotoService(
      flickrService as FlickrService,
    );
    const flickrResponse: FlickrResponse = {
      stat: "ok",
      photoset: {
        photo: [
          {
            id: "id",
            title: "title",
            datetaken: "2020-01-15",
            ownername: "ownername",
            views: "11",
            url_l: "url_l",
            height_l: 1000,
            width_l: 500,
            url_m: "url_m",
            height_m: 200,
            width_m: 20,
          },
        ],
        pages: 1,
      },
    };
    fetchPhotosFromAlbum.mockReturnValue(Promise.resolve(flickrResponse));
    const expectedPhotos: Photo[] = [
      {
        id: "id",
        dateWhenTaken: "15th January 2020",
        owner: "ownername",
        title: "title",
        views: 11,
        picture: {
          height: 1000,
          width: 500,
          url: "url_l",
        } as Image,
        thumbnail: {
          height: 200,
          width: 20,
          url: "url_m",
        } as Image,
      } as Photo,
    ];

    const result = await photoService.getPhotos("albumId", 1, 10);

    expect(result).toStrictEqual({
      photos: expectedPhotos,
      totalPages: 1,
    });
  });

  it("should return empty result if flickr api returns error", async () => {
    const photoService: PhotoService = new PhotoService(
      flickrService as FlickrService,
    );
    const flickrResponse: Partial<FlickrResponse> = {
      stat: "error",
    };
    fetchPhotosFromAlbum.mockReturnValue(Promise.resolve(flickrResponse));

    const result = await photoService.getPhotos("albumId", 1, 10);

    expect(result).toStrictEqual({
      photos: [],
      totalPages: -1,
    });
  });
});
