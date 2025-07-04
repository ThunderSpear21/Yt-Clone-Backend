import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      typeof: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      typeof: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

subscriptionSchema.plugin(mongooseAggregatePaginate);
export const Subscription = mongoose.model("Subscription", subscriptionSchema);
