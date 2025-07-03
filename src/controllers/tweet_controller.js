import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet_model.js";
import { User } from "../models/user_model.js";
import { apiError, ApiError } from "../utils/apiError.js";
import { apiResponse, ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const userId = req.user?._id;
  const { content } = req.body;

  if (!content) throw new apiError(404, "Tweet content cannot be empty");
  const user = await User.findById(userId);

  const tweet = await Tweet.create({
    content: content,
    owner: user,
  });

  if (!tweet) throw new apiError(500, "Error posting tweet");
  return res
    .status(200)
    .json(new apiResponse(200, tweet, "Tweet posted successfully !!"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new apiError(400, "Invalid userId");

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        ownerDetails: 1
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, tweets, "Tweets fetched successfully !!"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  if (!tweetId) throw new apiError(404, "Missing tweetId");

  const oldTweet = await Tweet.findById(tweetId);
  if (!oldTweet) throw new apiError(400, "Invalid tweetId");

  if (req.user._id.toString() !== oldTweet.owner.toString())
    throw new apiError(402, "Not authorized to edit tweet !!");
  const { newContent } = req.body;

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: newContent,
      },
    },
    { new: true }
  );
  if (!tweet) throw new apiError(500, "Server Error while updating");

  return res
    .status(200)
    .json(new apiResponse(200, tweet, "Tweet updated successfully !"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId) throw new apiError(404, "Missing tweetId");

  const oldTweet = await Tweet.findById(tweetId);
  if (!oldTweet) throw new apiError(400, "Invalid tweetId");

  if (req.user._id.toString() !== oldTweet.owner.toString())
    throw new apiError(402, "Not authorized to delete tweet !!");

  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Tweet deleted successfully !!"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
