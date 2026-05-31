const mongoose = require("mongoose");

const TalentGraphEdgeSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_TalentGraphNode`,
      index: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_TalentGraphNode`,
      index: true,
    },

    type: {
      type: String,
      enum: ["skill_similarity", "career_path", "company_switch", "project_similarity"],
    },

    weight: { type: Number, default: 1 },

    decayFactor: { type: Number, default: 1 }, // time relevance
  },
  { timestamps: true }
);

/* ============================== */

TalentGraphEdgeSchema.methods.boost = async function (value = 0.1) {
  this.weight += value;
  await this.save();
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_TalentGraphEdge`] ||
  mongoose.model(`${process.env.APP_NAME}_TalentGraphEdge`, TalentGraphEdgeSchema);