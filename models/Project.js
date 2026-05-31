const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_User`,
      index: true,
      required: true,
    },

    title: { type: String, required: true },
    description: String,

    techStack: [String],

    links: {
      github: String,
      live: String,
      docs: String,
    },

    media: [
      {
        url: String,
        type: { type: String, enum: ["image", "video", "gif"] },
      },
    ],

    // Trust layer
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },

    verificationScore: { type: Number, default: 0 },

    // AI scoring
    aiQualityScore: { type: Number, default: 0 },

    // Engagement
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ==============================
   METHODS
============================== */

ProjectSchema.methods.incrementView = async function () {
  this.views += 1;
  await this.save();
};

ProjectSchema.methods.incrementLike = async function () {
  this.likes += 1;
  await this.save();
};

ProjectSchema.methods.updateVerification = async function (score, status) {
  this.verificationScore = score;
  this.verificationStatus = status;
  await this.save();
};

/* ============================== */

module.exports =
  mongoose.models[`${process.env.APP_NAME}_Project`] ||
  mongoose.model(`${process.env.APP_NAME}_Project`, ProjectSchema);