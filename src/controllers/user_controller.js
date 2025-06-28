import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user_model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  if (fullName === "") throw new apiError(400, "Full Name is required");
  if (password === "") throw new apiError(400, "Password is required");
  if (username === "") throw new apiError(400, "Username is required");
  if (email === "") throw new apiError(400, "Email is required");

  const notUniqueUser = User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (notUniqueUser)
    throw new apiError(409, "Username or Email already in use !");

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath) throw new apiError(400, "Avatar Image is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar) throw new apiError(400, "Avatar Image is required");

  const user = await User.create({
    fullName: fullName,
    avatar: avatar.url,
    email: email,
    coverImage: coverImage?.url || "",
    password: password,
    username: username.toLowerCase(),

  });

  isCreatedUser = await User.findById(user._id).select("-password -refreshToken -watchHistory");
  if(!isCreatedUser)  throw new apiError(500, "Something went wrong while registering user");

  return res.status(201).json( new apiResponse(200, isCreatedUser, "User Registered Successfully"));
});

export { registerUser };
