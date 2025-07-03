import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user_model.js";
import { Subscription } from "../models/subscription_model.js";
import { apiError, ApiError } from "../utils/apiError.js";
import { apiResponse, ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  const userId = req.user?._id;
  const channel = await User.findById(channelId);

  if (!channel) throw new apiError(400, "Invalid channelId !!");

  if (userId.toString() === channelId.toString()) {
    throw new apiError(400, "You cannot subscribe to yourself!");
  }

  const isSubscribed = await Subscription.findOne({
    subscriber: new mongoose.Types.ObjectId(userId),
    channel: new mongoose.Types.ObjectId(channelId),
  });

  if (!isSubscribed) {
    const subscribe = await Subscription.create({
      subscriber: new mongoose.Types.ObjectId(userId),
      channel: new mongoose.Types.ObjectId(channelId),
    });
    return res
      .status(200)
      .json(new apiResponse(200, subscribe, "Subscribed Successfully !!"));
  } else {
    await Subscription.findByIdAndDelete(isSubscribed?._id);
    return res
      .status(200)
      .json(new apiResponse(200, {}, "Unsubscribed Successfully !!"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) throw new apiError(404, "channelId required !!");

  if (!(await User.findById(channelId)))
    throw new apiError(402, "Invalid channelId");

  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelSubscribers,
        "List of subscribers fetched successfully !!"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId: subscriberId } = req.params;
  if (!subscriberId) throw new apiError(404, "subscriberId required !!");

  if (!(await User.findById(subscriberId)))
    throw new apiError(402, "Invalid subscriberId");

  const channelsSubscribedTo = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelsSubscribedTo,
        "List of channels subscribed to fetched successfully !!"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
