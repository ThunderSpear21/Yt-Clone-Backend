import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist_model.js";
import { apiError, ApiError } from "../utils/apiError.js";
import { apiResponse, ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  const userId = req.user?._id;

  if (!name || !description)
    throw new apiError(404, "Name and Description required !!");

  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: new mongoose.Types.ObjectId(userId),
  });

  if (!playlist) throw new apiError(500, "Server Error !!");

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist created successfully !!"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!isValidObjectId(userId)) throw new apiError(400, "Invalid userId");

  const userPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "Video",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        userPlaylists,
        "User Playlists fetched successfully !!"
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId))
    throw new apiError(404, "Invalid playlistId !");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new apiError(500, "Error fetching playlist !!");

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist fetched successfully !!"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: add video to playlist

  if (
    !playlistId ||
    !videoId ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  )
    throw new apiError(400, "Missing or Invalid id !!");

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { videos: videoId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist updated successfully !!"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (
    !playlistId ||
    !videoId ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  )
    throw new apiError(400, "Missing or Invalid id !!");

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Video removed successfully !!"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!playlistId) throw new apiError(400, "Missing playlistId !!");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new apiError(400, "Invalid playlistId");

  if (playlist.owner.toString() !== req.user?._id.toString())
    throw new apiError(400, "Unauthorized deletion !!");

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Playlist deleted successfully !!"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!playlistId) throw new apiError(404, "missing playlistId");

  if (!name || !description)
    throw new apiError(404, "Name and description required !!");

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name: name,
        description: description,
      },
    },
    { new: true }
  );
  if (!playlist) throw new apiError(500, "Error updating the playlist !!");

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
