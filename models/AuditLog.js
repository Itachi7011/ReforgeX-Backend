const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    action: { type: String, index: true },

    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,

    before: Object,
    after: Object,

    ip: String,
    userAgent: String,

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  { timestamps: true }
);

/* ============================== */

AuditLogSchema.statics.logAction = function (payload) {
  return this.create(payload);
};

module.exports =
  mongoose.models[`${process.env.APP_NAME}_AuditLog`] ||
  mongoose.model(`${process.env.APP_NAME}_AuditLog`, AuditLogSchema);