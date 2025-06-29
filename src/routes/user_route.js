import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user_controller.js";
import { upload } from "../middlewares/multer_middleware.js";
import { verifyJWT } from "../middlewares/auth_middleware.js";

const router = Router();

// Using middleware multer to handle multiple file uploads before passing to controller
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

// While routing the login, since we don't need any file input, the multer middleware is not needed. Thus, destructuring the data later
// in the login controller gives error as it cannot destructure such form-data type request body. In that case, we can either apply a 
// middleware to the route which doesn't upload anything : router.route("/login").post(upload.none(), loginUser);
// or send raw json data while testing

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);
export default router;
