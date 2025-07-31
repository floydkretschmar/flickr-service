import { afterEach, describe, expect, it, vi } from "vitest";
import { FlickrResponse, FlickrService } from "../flickrService.js";

global.fetch = vi.fn();

function createFetchResponse(data: FlickrResponse): Promise<Response> {
  return Promise.resolve({
    json: () => new Promise<FlickrResponse>((resolve) => resolve(data)),
  } as Response);
}

describe("Flickr service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should fetch pictures from flickr api", async () => {
    const flickrService: FlickrService = new FlickrService(
      "apiKey",
      "flickrUrl",
    );
    const flickrResponse: FlickrResponse = {
      stat: "ok",
      photoset: {
        photo: [
          {
            id: "string",
            title: "string",
            datetaken: "15-01-2020",
            ownername: "ownername",
            views: "11",
            url_l: "url_l",
            height_l: 1000,
            width_l: 5000,
            url_m: "url_m",
            height_m: 200,
            width_m: 20,
          },
        ],
        pages: 1,
      },
    };

    vi.mocked(global.fetch).mockReturnValue(
      createFetchResponse(flickrResponse),
    );

    const result = await flickrService.fetchPhotosFromAlbum("albumId", 1, 10);

    expect(result).toBe(flickrResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "flickrUrl?method=flickr.photosets.getPhotos&api_key=apiKey&photoset_id=albumId&extras=url_l,url_m,owner_name,date_taken,views&page=1&format=json&nojsoncallback=1&per_page=10",
    );
  });
});
