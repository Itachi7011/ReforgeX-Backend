const mongoose = require("mongoose");

/* =================================
   SUB SCHEMAS
================================= */

const ScoreBreakdownSchema =
  new mongoose.Schema(
    {
      identityScore: {
        type: Number,
        default: 0,
      },

      employmentScore: {
        type: Number,
        default: 0,
      },

      documentScore: {
        type: Number,
        default: 0,
      },

      technicalScore: {
        type: Number,
        default: 0,
      },

      peerScore: {
        type: Number,
        default: 0,
      },

      aiAdaptabilityScore: {
        type: Number,
        default: 0,
      },

      behaviorScore: {
        type: Number,
        default: 0,
      },

      fraudPenalty: {
        type: Number,
        default: 0,
      },
    },
    { _id: false }
  );

const ScoreHistorySchema =
  new mongoose.Schema(
    {
      score: Number,

      reason: String,

      changedBy: {
        type: String,
        enum: ["system", "reviewer", "ai"],
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: false }
  );

/* =================================
   MAIN SCHEMA
================================= */

const TrustScoreSchema =
  new mongoose.Schema(
    {
      /* =================================
         USER RELATION
      ================================= */

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
        required: true,
        unique: true,
        index: true,
      },

      candidateProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_CandidateProfile`,
        required: true,
      },

      /* =================================
         FINAL SCORE
      ================================= */

      totalTrustScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        index: true,
      },

      trustTier: {
        type: String,
        enum: [
          "unverified",
          "rising",
          "trusted",
          "elite",
          "legend",
        ],
        default: "unverified",
        index: true,
      },

      /* =================================
         BREAKDOWN
      ================================= */

      breakdown: ScoreBreakdownSchema,

      /* =================================
         SCORE DYNAMICS
      ================================= */

      volatilityIndex: {
        type: Number,
        default: 0,
      },

      scoreTrend: {
        type: String,
        enum: ["rising", "stable", "declining"],
        default: "stable",
      },

      lastCalculatedAt: Date,

      /* =================================
         PENALTIES / BOOSTS
      ================================= */

      penalties: [
        {
          reason: String,

          impactScore: Number,

          severity: {
            type: String,
            enum: ["low", "medium", "high"],
          },

          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      boosts: [
        {
          reason: String,

          boostScore: Number,

          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      /* =================================
         HISTORY
      ================================= */

      history: [ScoreHistorySchema],

      /* =================================
         SYSTEM FLAGS
      ================================= */

      recalculationRequired: {
        type: Boolean,
        default: false,
      },

      lastVerifiedSyncAt: Date,

      /* =================================
         ANALYTICS
      ================================= */

      profileRankGlobal: {
        type: Number,
        default: 0,
      },

      profileRankIndustry: {
        type: Number,
        default: 0,
      },

      percentile: {
        type: Number,
        default: 0,
      },

      /* =================================
         FRAUD IMPACT
      ================================= */

      fraudExposureLevel: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "low",
      },

      isShadowBanned: {
        type: Boolean,
        default: false,
      },

      isSoftDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/* =================================
   INDEXES
================================= */

TrustScoreSchema.index({
  totalTrustScore: -1,
});

// TrustScoreSchema.index({
//   trustTier: 1,
// });

TrustScoreSchema.index({
  percentile: -1,
});

TrustScoreSchema.index({
  fraudExposureLevel: 1,
});

/* =================================
   VIRTUALS
================================= */

TrustScoreSchema.virtual("isTopTalent").get(function () {
  return this.totalTrustScore >= 90;
});

TrustScoreSchema.virtual("isTrusted").get(function () {
  return this.totalTrustScore >= 70;
});

/* =================================
   PRE SAVE HOOKS
================================= */

// AUTO CALCULATE TOTAL SCORE
TrustScoreSchema.pre("save", function (next) {
  const b = this.breakdown;

  let score =
    (b.identityScore * 0.15) +
    (b.employmentScore * 0.25) +
    (b.documentScore * 0.15) +
    (b.technicalScore * 0.2) +
    (b.peerScore * 0.1) +
    (b.aiAdaptabilityScore * 0.1) +
    (b.behaviorScore * 0.05) -
    (b.fraudPenalty || 0);

  score = Math.max(0, Math.min(100, score));

  this.totalTrustScore = Math.round(score);

  // TIER ASSIGNMENT
  if (score >= 90) {
    this.trustTier = "legend";
  } else if (score >= 80) {
    this.trustTier = "elite";
  } else if (score >= 70) {
    this.trustTier = "trusted";
  } else if (score >= 50) {
    this.trustTier = "rising";
  } else {
    this.trustTier = "unverified";
  }

  next();
});

/* =================================
   INSTANCE METHODS
================================= */

// UPDATE BREAKDOWN
TrustScoreSchema.methods.updateBreakdown = async function (data) {
  this.breakdown = {
    ...this.breakdown,
    ...data,
  };

  this.recalculationRequired = true;

  await this.save();
};

// APPLY FRAUD PENALTY
TrustScoreSchema.methods.applyFraudPenalty = async function (reason, score, severity = "medium") {
  this.penalties.push({
    reason,
    impactScore: score,
    severity,
  });

  this.breakdown.fraudPenalty += score;

  await this.save();
};

// ADD BOOST
TrustScoreSchema.methods.addBoost = async function (reason, score) {
  this.boosts.push({
    reason,
    boostScore: score,
  });

  await this.save();
};

// ADD HISTORY ENTRY
TrustScoreSchema.methods.addHistory = async function (score, reason, changedBy = "system") {
  this.history.push({
    score,
    reason,
    changedBy,
  });

  this.lastCalculatedAt = new Date();

  await this.save();
};

// RECALCULATE SCORE
TrustScoreSchema.methods.recalculate = async function () {
  this.recalculationRequired = false;

  this.lastCalculatedAt = new Date();

  await this.save();
};

// SOFT BAN USER
TrustScoreSchema.methods.shadowBan = async function (reason) {
  this.isShadowBanned = true;

  this.penalties.push({
    reason,
    impactScore: 50,
    severity: "high",
  });

  await this.save();
};

// GET PUBLIC SCORE
TrustScoreSchema.methods.getPublicScore = function () {
  return {
    totalTrustScore: this.totalTrustScore,
    trustTier: this.trustTier,
    percentile: this.percentile,
    isTopTalent: this.isTopTalent,
    isTrusted: this.isTrusted,
  };
};

/* =================================
   STATIC METHODS
================================= */

// TOP TALENT
TrustScoreSchema.statics.findTopTalent = async function () {
  return this.find({
    totalTrustScore: { $gte: 85 },
    isSoftDeleted: false,
    isShadowBanned: false,
  }).sort({ totalTrustScore: -1 });
};

// LOW TRUST USERS
TrustScoreSchema.statics.findLowTrust = async function () {
  return this.find({
    totalTrustScore: { $lte: 40 },
  });
};

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_TrustScore`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_TrustScore`,
    TrustScoreSchema
  );