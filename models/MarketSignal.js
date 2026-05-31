const mongoose = require("mongoose");

const MarketSignalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["layoff_spike", "skill_demand", "hiring_surge"],
      index: true,
    },

    strength: Number,

    relatedSkill: String,
    relatedCompany: String,

    region: String,

    metadata: Object,

    decayScore: { type: Number, default: 1 },
  },
  { timestamps: true }
);

/* ============================== */

MarketSignalSchema.methods.decay = async function () {
  this.strength *= this.decayScore;
  await this.save();
};

MarketSignalSchema.statics.getStrongSignals = function () {
  return this.find().sort({ strength: -1 }).limit(30);
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_MarketSignal`] ||
  mongoose.model(`${process.env.APP_NAME}_MarketSignal`, MarketSignalSchema);