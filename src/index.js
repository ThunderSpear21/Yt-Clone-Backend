import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.on("error", (e) => {
        console.log("Error :: ", e);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log("Server running at port : ", process.env.PORT || 8000);
    });
  })
  .catch((e) => {
    console.log("MongoDB Connection failed :: ", e);
  });
