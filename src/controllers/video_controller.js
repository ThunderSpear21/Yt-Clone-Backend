import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video_model.js";
import { User } from "../models/user_model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const pageStart = parseInt(page) - 1;
  const limitSize = parseInt(limit);
  const skip = pageStart * limitSize;

  const user = await User.findById(userId);
  if (!user) throw new apiError(402, "Invalid User !");

  const sortField = sortBy || "createdAt";
  const sortOrder = sortType === "desc" ? -1 : 1;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $sort: {
        [sortField]: sortOrder,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limitSize,
    },
  ]);

  if (!videos) throw new apiError(500, "Error filtering videos !!");
  return res
    .status(200)
    .json(new apiResponse(200, videos, "Videos fetched successfully !!"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!title || !description)
    throw new apiError(404, "Missing title or description");

  const videoPath = req?.files?.videoFile?.[0]?.path;
  const thumbnailPath = req?.files?.thumbnail?.[0]?.path;

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
  const thumbnailPath = req?.files?.thumbnail?.[0]?.path;
  if (!title || !description || !thumbnailPath)
    throw new apiError(400, "Missing fields !");

  const thumbnailUrl = await uploadOnCloudinary(thumbnailPath);

  const oldVideo = await Video.findById(videoId);
  await deleteFromCloudinary(oldVideo.thumbnail);

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnailUrl.url,
        title: title,
        description: description,
      },
    },
    {
      new: true,
    }
  );

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

  await deleteFromCloudinary(videoUrl);
  await deleteFromCloudinary(thumbnailUrl);

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
    .json(new apiResponse(200, video, "Changed published status !!"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
