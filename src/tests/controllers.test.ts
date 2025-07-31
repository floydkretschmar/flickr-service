/** person.test.js */
import { describe, expect, it, afterEach, vi } from "vitest";
import {
  GetPhotoRequestBody,
  GetPhotoRequestDictionary,
  GetPhotoRequestQuery,
  GetPhotoResponseBody,
  getPicturesController,
} from "../controllers.js";
import { Request, Response } from "express";
import { Image, Photo, PhotoService, Thumbnail } from "../photoService.js";
import { getMockRes } from "vitest-mock-express";

describe("Pictures controller", () => {
  const getPhotos = vi.fn();
  const photoService: Partial<PhotoService> = { getPhotos: getPhotos };

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should return pictures response for valid request", async () => {
    const request: Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    > = {
      params: {
        albumId: "testAlbumId",
      },
      query: {
        page: 1,
        limit: 5,
      },
    } as Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    >;
    const { res } = getMockRes();
    const photo: Photo = {
      id: "id1",
      dateWhenTaken: "dateWhenTaken",
      owner: "owner",
      title: "title",
      views: 10,
      picture: {
        fallback: "url_l",
        url: "bucketUrl/title_id1_o.jpg",
      } as Image,
      thumbnail: {
        height: 100,
        width: 50,
        url: "url_t",
      } as Thumbnail,
    } as Photo;

    getPhotos.mockReturnValue({
      photos: [photo],
      totalPages: 1,
    });

    await getPicturesController(
      photoService as PhotoService,
      request,
      res as Response<GetPhotoResponseBody>,
    );

    expect(res.status).toHaveBeenCalledTimes(0);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      data: [photo],
      limit: 5,
      page: 1,
      totalPages: 1,
    });
  });

  it("should return 404 response for request without pictures", async () => {
    const request: Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    > = {
      params: {
        albumId: "testAlbumId",
      },
      query: {
        page: 2,
        limit: 5,
      },
    } as Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    >;
    const { res } = getMockRes();

    vi.mocked(getPhotos).mockReturnValue({
      photos: [],
      totalPages: -1,
    });

    await getPicturesController(photoService as PhotoService, request, res);

    expect(res.send).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.statusMessage).toBe("No results found for this page");
  });

  it("should return 422 response for request with invalid page number", async () => {
    const request: Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    > = {
      params: {
        albumId: "testAlbumId",
      },
      query: {
        page: 0,
        limit: 5,
      },
    } as Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    >;
    const { res } = getMockRes();

    await getPicturesController(photoService as PhotoService, request, res);

    expect(res.send).toHaveBeenCalledTimes(0);
    expect(getPhotos).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.statusMessage).toBe("Page index has to be 1 or larger");
  });

  it("should return 500 response for any unexpected error during request", async () => {
    const request: Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    > = {
      params: {
        albumId: "testAlbumId",
      },
      query: {
        page: 2,
        limit: 5,
      },
    } as Request<
      GetPhotoRequestDictionary,
      GetPhotoResponseBody,
      GetPhotoRequestBody,
      GetPhotoRequestQuery
    >;
    const { res } = getMockRes();

    vi.mocked(getPhotos).mockRejectedValue(new Error("Unexpected error"));

    await getPicturesController(photoService as PhotoService, request, res);

    expect(res.send).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.statusMessage).toBe(
      "An error occurred while fetching the photos",
    );
  });
});
