import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;
    const res = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    console.log("File Uploadaed to Cloudinary Successfully", res);
    fs.unlinkSync(filePath);
    return res;
  } catch (error) {
    fs.unlinkSync(filePath); // removes the file from local storage as upload has failed
    return null;
  }
};

const deleteFromCloudinary = async (cloudinaryUrl) => {
  try {
    const fileName = cloudinaryUrl.substring(
      cloudinaryUrl.lastIndexOf("/") + 1
    );
    const publicId = fileName.split(".")[0];
    const resourceType = cloudinaryUrl.includes("/video/") ? "video" : "image";
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log("Deleted from Cloudinary:", result);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
