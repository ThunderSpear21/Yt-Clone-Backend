import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video_model.js";
import { User } from "../models/user_model.js";
import { apiError, ApiError } from "../utils/ApiError.js";
import { apiResponse, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || !description)
    throw new apiError(404, "Missing title or description");

  const videoPath = req?.files?.videoFile?.[0];
  const thumbnailPath = req?.files?.thumbnail?.[0];

  if (!videoPath || !thumbnailPath)
    throw new apiError(500, "Video or Thumbanil missing");

  const videoUrl = await uploadOnCloudinary(videoPath);
  const thumbnailUrl = await uploadOnCloudinary(thumbnailPath);

  if (!videoUrl || !thumbnailUrl)
    throw new apiError(500, "Error while uploading");

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  const video = await Video.create({
    videoFile: videoUrl.url,
    thumbnail: thumbnailUrl.url,
    title: title,
    description: description,
    duration: videoUrl.duration,
    views: 0,
    isPublished: true,
    owner: user,
  });

  if (!video) throw new apiError(500, "Error while publishing");

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video published successfully !!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!videoId) throw new apiError(404, "Missing videoId");

  const video = await Video.findById(videoId);

  if (!video) throw new apiError(500, "Error fetching video");

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video fetched successfully !!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  if (!videoId) throw new apiError(404, "Missing videoId");

  const { title, description } = req.body;
  const thumbnailPath = req?.files?.thumbnail?.[0];
  if (!title || !description || !thumbnailPath)
    throw new apiError(400, "Missing fields !");

  const thumbnailUrl = await uploadOnCloudinary(thumbnailPath);

  await deleteFromCloudinary(video.videoFile);

  const video = await Video.findByIdAndUpdate(videoId, {
    $set: {
      thumbnail: thumbnailUrl.url,
      title: title,
      description: description,
    },
  });

  if (!video) throw new apiError(402, "Invalid videoId or Failed update");

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video updated successfully !!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  const video = await Video.findById(videoId);

  if (!video) throw new apiError(400, "This video doesn't exists");

  const thumbnailUrl = video.thumbnail;
  const videoUrl = video.videoFile;

  await deleteFromCloudinary(thumbnailUrl);
  await deleteFromCloudinary(videoUrl);

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Video deleted successfully !!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) throw new apiError(404, "Video not found !!");

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        video,
        "Changed published status !!"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
