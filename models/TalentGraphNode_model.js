const mongoose = require("mongoose");

const TalentGraphNodeSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_CandidateProfile`,
      required: true,
      index: true,
    },

    nodeType: {
      type: String,
      enum: ["candidate", "skill_cluster", "company_cluster"],
      default: "candidate",
      index: true,
    },

    embedding: {
      type: [Number],
      default: [],
    },

    clusterId: String,

    centralityScore: { type: Number, default: 0 },
    influenceScore: { type: Number, default: 0 },

    lastUpdatedAt: Date,
  },
  { timestamps: true }
);

/* ==============================
   METHODS
============================== */

TalentGraphNodeSchema.methods.updateEmbedding = async function (vector) {
  this.embedding = vector;
  this.lastUpdatedAt = new Date();
  await this.save();
};

TalentGraphNodeSchema.methods.updateScores = async function ({
  centrality,
  influence,
}) {
  if (centrality !== undefined) this.centralityScore = centrality;
  if (influence !== undefined) this.influenceScore = influence;

  await this.save();
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_TalentGraphNode`] ||
  mongoose.model(`${process.env.APP_NAME}_TalentGraphNode`, TalentGraphNodeSchema);