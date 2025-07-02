import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "32kb" })); // limit the amount of server requests

app.use(express.urlencoded({ extended: true, limit: "32kb" })); // blankspace <=> %20, extended allows nested object, etc

app.use(express.static("public"));  // store on server in a folder named "public"

app.use(cookieParser());


import userRouter from "./routes/user_route.js";
import healthcheckRouter from "./routes/healthcheck_route.js"
import tweetRouter from "./routes/tweet_route.js"
import subscriptionRouter from "./routes/subscription_route.js"
import videoRouter from "./routes/video_route.js"
import commentRouter from "./routes/comment_route.js"
import likeRouter from "./routes/like_route.js"
import playlistRouter from "./routes/playlist_route.js"
import dashboardRouter from "./routes/dashboard_route.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

export { app };
