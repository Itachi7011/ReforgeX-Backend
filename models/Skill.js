const mongoose = require("mongoose");

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["programming", "framework", "cloud", "database", "devops", "ai_ml", "soft_skill", "other"],
      default: "other",
      index: true,
    },

    aliases: [String],

    // Market intelligence
    demandScore: { type: Number, default: 0 },
    supplyScore: { type: Number, default: 0 },
    difficultyScore: { type: Number, default: 0 },

    trendVelocity: { type: Number, default: 0 }, // how fast demand is changing

    // AI enrichment
    embeddingVector: { type: [Number], default: [] },
    lastVectorUpdateAt: Date,

    verifiedBySystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ==============================
   INSTANCE METHODS
============================== */

SkillSchema.methods.updateMarketSignal = async function ({
  demandDelta = 0,
  supplyDelta = 0,
}) {
  this.demandScore += demandDelta;
  this.supplyScore += supplyDelta;

  this.trendVelocity = this.demandScore - this.supplyScore;

  await this.save();
};

SkillSchema.methods.updateEmbedding = async function (vector) {
  this.embeddingVector = vector;
  this.lastVectorUpdateAt = new Date();
  await this.save();
};

/* ==============================
   STATIC METHODS
============================== */

SkillSchema.statics.getHotSkills = function () {
  return this.find().sort({ trendVelocity: -1 }).limit(25);
};

SkillSchema.statics.searchSkill = function (query) {
  return this.find({
    name: { $regex: query, $options: "i" },
  });
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_Skill`] ||
  mongoose.model(`${process.env.APP_NAME}_Skill`, SkillSchema);