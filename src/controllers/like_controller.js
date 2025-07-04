import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like_model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video_model.js";
import { Tweet } from "../models/tweet_model.js";
import { Comment } from "../models/comment_model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  const userId = req.user?._id;
  if (!videoId || !isValidObjectId(videoId))
    throw new apiError(400, "Invalid or missing videoId");

  const videoExists = await Video.findById(videoId);
  if (!videoExists) throw new apiError(404, "Video not found");

  const videoLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (!videoLike) {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });

    return res.status(200).json(new apiResponse(200, {}, "Video Liked !!"));
  } else {
    await Like.findByIdAndDelete(videoLike._id);
    return res.status(200).json(new apiResponse(200, {}, "Video Unliked !!"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  const userId = req.user?._id;
  if (!commentId || !isValidObjectId(commentId))
    throw new apiError(400, "Invalid or missing commentId");

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new apiError(404, "Comment not found");

  const commentLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (!commentLike) {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    return res.status(200).json(new apiResponse(200, {}, "Comment Liked !!"));
  } else {
    await Like.findByIdAndDelete(commentLike._id);
    return res.status(200).json(new apiResponse(200, {}, "Comment Unliked !!"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  const userId = req.user?._id;
  if (!tweetId || !isValidObjectId(tweetId))
    throw new apiError(400, "Invalid or missing tweetId");

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) throw new apiError(404, "Tweet not found");

  const tweetLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (!tweetLike) {
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });

    return res.status(200).json(new apiResponse(200, {}, "Tweet Liked !!"));
  } else {
    await Like.findByIdAndDelete(tweetLike._id);
    return res.status(200).json(new apiResponse(200, {}, "Tweet Unliked !!"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        likedVideos,
        "List of user-liked videos fetched successfully !!"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
