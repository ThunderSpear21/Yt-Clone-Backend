import mongoose from "mongoose";
import { Comment } from "../models/comment_model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video_model.js";
import { User } from "../models/user_model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const pageStart = parseInt(page) - 1;
  const limitSize = parseInt(limit);
  const skip = pageStart * limitSize;

  const video = await Video.findById(videoId);
  if (!video) throw new apiError(404, "Video not found");

  const videoComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limitSize,
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, videoComments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content) throw new apiError(400, "Content is required");

  if (!videoId) throw new apiError(400, "videoId is required");

  const video = await Video.findById(videoId);

  if (!video) throw new apiError(400, "Invalid videoId !!");

  const comment = await Comment.create({
    content: content,
    owner: req.user._id,
    video: video._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) {
    throw new apiError(400, "Missing commentId !");
  }
  if (!content) {
    throw new apiError(400, "Missing content !!");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new apiResponse(200, comment, "Comment updated successfully !!"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!commentId) throw new apiError(400, "Missing commentId !");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new apiError(400, "Invalid commentId");

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Comment deleted successfully !!"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
