import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user_model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong with Refresh and Access Tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // console.log(req.body);
  const { username, email, fullName, password } = req.body;
  if (fullName === "") throw new apiError(400, "Full Name is required");
  if (password === "") throw new apiError(400, "Password is required");
  if (username === "") throw new apiError(400, "Username is required");
  if (email === "") throw new apiError(400, "Email is required");

  const notUniqueUser = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (notUniqueUser)
    throw new apiError(409, "Username or Email already in use !");

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath = "";
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) throw new apiError(400, "Avatar Image is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new apiError(400, "Avatar Image is required");

  const user = await User.create({
    fullName: fullName,
    avatar: avatar.url,
    email: email,
    coverImage: coverImage?.url || "",
    password: password,
    username: username,
  });

  const isCreatedUser = await User.findById(user._id).select(
    "-password -refreshToken -watchHistory"
  );
  if (!isCreatedUser)
    throw new apiError(500, "Something went wrong while registering user");

  return res
    .status(201)
    .json(new apiResponse(200, isCreatedUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //console.log(await req.body);

  let { email, username, password } = req.body;

  if (!email && !username)
    throw new apiError(400, "Either Email or Username required");

  const currentUser = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (!currentUser) throw new apiError(404, "User does not exist");

  const isPasswordValid = await currentUser.isPasswordCorrect(password);
  if (!isPasswordValid) throw new apiError(401, "Wrong Password");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    currentUser._id
  );

  const loggedInUser = await User.findById(currentUser._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new apiError(400, "Unauthorized User");
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) throw new apiError(400, "Unauthorized User");

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new apiError(401, "Invalid Refresh Token");

    const options = {
      httpOnly: true,
      secure: true,
    };

    if (incomingRefreshToken != user?.refreshToken)
      throw new apiError(400, "Refresh Token has expired");

    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { newAccessToken, newRefreshToken },
          "Access Token refreshed successfully !!"
        )
      );
  } catch (error) {
    throw new apiError(400, error?.message || "Invalid Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  if (!user.isPasswordCorrect(oldPassword))
    throw new apiError(400, "Existing Password does not match !");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password Changes Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) throw new apiError(401, "No user signed in !!");
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );
  return res
    .status(200)
    .json(new apiResponse(200, { user }, "Current Logged In User"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, username } = req.body;
  if (!username || !fullName)
    throw new apiError(400, "Username and Full Name required");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName,
        username: username,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200).json(new apiResponse(200, user, "Account Details Updated !!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) throw new apiError(404, "Image is missing");
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url)
    throw new apiError(500, "Error while uploading Avatar Image");

  const oldAvatarUser = await User.findById(req.user?._id);
  const oldAvatar = oldAvatarUser.avatar;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  await deleteFromCloudinary(oldAvatar);
  return res.status(200).json(new apiResponse(200, user, "Avatar updated successfully !!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!coverImageLocalPath) throw new apiError(404, "Image is missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new apiError(500, "Error while uploading Avatar Image");

  const oldCoverImageUser = await User.findById(req.user?._id);
  const oldCoverImage = oldCoverImageUser.coverImage;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  await deleteFromCloudinary(oldCoverImage);
  return res.status(200).json(new apiResponse(200, user, "Cover Image updated successfully !!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) throw new apiError(404, "Username missing");

  const channel = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo"},
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) throw new apiError(404, "Channel data not found !!");

  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "User channel fetched successfully !!"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $project: {
        refreshToken: 0,
        password: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully !!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
