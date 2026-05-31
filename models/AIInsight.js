const mongoose = require("mongoose");

const AIInsightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },

    type: {
      type: String,
      enum: ["career_path", "skill_gap", "job_match", "layoff_risk", "salary_estimate"],
    },

    inputContext: Object,

    output: String,

    confidence: Number,

    modelVersion: String,

    usefulnessScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ============================== */

AIInsightSchema.methods.upvoteUsefulness = async function () {
  this.usefulnessScore += 1;
  await this.save();
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_AIInsight`] ||
  mongoose.model(`${process.env.APP_NAME}_AIInsight`, AIInsightSchema);