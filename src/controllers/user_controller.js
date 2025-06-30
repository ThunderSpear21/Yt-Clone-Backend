import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user_model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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
    username: username.toLowerCase(),
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
    res
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
