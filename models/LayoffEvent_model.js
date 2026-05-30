const mongoose = require("mongoose");

const LayoffEventSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, index: true },
    domain: String,

    employeesAffected: Number,
    percentage: Number,

    reason: {
      type: String,
      enum: ["ai_replacement", "cost_cutting", "restructuring", "shutdown", "unknown"],
    },

    region: String,

    eventDate: { type: Date, index: true },

    source: String,

    verified: { type: Boolean, default: false },

    impactScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ============================== */

LayoffEventSchema.methods.computeImpact = async function () {
  this.impactScore =
    (this.employeesAffected || 0) * (this.percentage || 1);

  await this.save();
};

LayoffEventSchema.statics.getRecentImpacts = function () {
  return this.find().sort({ impactScore: -1 }).limit(20);
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_LayoffEvent`] ||
  mongoose.model(`${process.env.APP_NAME}_LayoffEvent`, LayoffEventSchema);