const mongoose = require("mongoose");

/* =================================
   SUB SCHEMAS
================================= */

const VerificationStageSchema =
  new mongoose.Schema(
    {
      stageName: {
        type: String,
        required: true,
      },

      stageType: {
        type: String,
        enum: [
          "identity",
          "employment",
          "document",
          "technical",
          "peer",
          "ai_adaptability",
        ],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "in_review",
          "approved",
          "rejected",
          "flagged",
        ],
        default: "pending",
      },

      confidenceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
      },

      reviewedAt: Date,

      reviewerNotes: String,

      automatedChecksPassed: {
        type: Boolean,
        default: false,
      },

      manualReviewRequired: {
        type: Boolean,
        default: false,
      },

      evidenceRefs: [
        {
          type: mongoose.Schema.Types.ObjectId,
        },
      ],
    },
    { _id: true }
  );

const VerificationHistorySchema =
  new mongoose.Schema(
    {
      action: String,

      actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
      },

      metadata: Object,

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

const VerificationSchema =
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
         GLOBAL VERIFICATION STATUS
      ================================= */

      overallStatus: {
        type: String,
        enum: [
          "unverified",
          "partially_verified",
          "verified",
          "rejected",
          "under_review",
          "flagged",
        ],
        default: "unverified",
        index: true,
      },

      overallConfidenceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        index: true,
      },

      verificationBadgeLevel: {
        type: String,
        enum: [
          "none",
          "bronze",
          "silver",
          "gold",
          "platinum",
        ],
        default: "none",
        index: true,
      },

      /* =================================
         STAGES
      ================================= */

      stages: [VerificationStageSchema],

      /* =================================
         FRAUD & RISK
      ================================= */

      fraudRiskLevel: {
        type: String,
        enum: [
          "low",
          "medium",
          "high",
          "critical",
        ],
        default: "low",
        index: true,
      },

      fraudSignals: [
        {
          signal: String,

          severity: {
            type: String,
            enum: [
              "low",
              "medium",
              "high",
            ],
          },

          detectedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      /* =================================
         REVIEW SYSTEM
      ================================= */

      assignedReviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
      },

      reviewPriority: {
        type: String,
        enum: [
          "low",
          "normal",
          "high",
          "critical",
        ],
        default: "normal",
        index: true,
      },

      escalationRequired: {
        type: Boolean,
        default: false,
      },

      /* =================================
         SYSTEM FLAGS
      ================================= */

      requiresReverification: {
        type: Boolean,
        default: false,
      },

      reverificationReason: String,

      lastVerifiedAt: Date,

      nextVerificationDueAt: Date,

      /* =================================
         ANALYTICS
      ================================= */

      verificationAttempts: {
        type: Number,
        default: 0,
      },

      automatedChecksCount: {
        type: Number,
        default: 0,
      },

      manualReviewsCount: {
        type: Number,
        default: 0,
      },

      /* =================================
         AUDIT HISTORY
      ================================= */

      history: [VerificationHistorySchema],

      /* =================================
         MODERATION
      ================================= */

      moderationFlags: [
        {
          reason: String,

          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

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

VerificationSchema.index({
  overallStatus: 1,
  overallConfidenceScore: -1,
});

VerificationSchema.index({
  fraudRiskLevel: 1,
});

VerificationSchema.index({
  verificationBadgeLevel: 1,
});

VerificationSchema.index({
  reviewPriority: 1,
});

VerificationSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

VerificationSchema.virtual(
  "approvedStagesCount"
).get(function () {
  return this.stages.filter(
    (stage) =>
      stage.status === "approved"
  ).length;
});

VerificationSchema.virtual(
  "verificationCompletionPercentage"
).get(function () {
  if (!this.stages.length) return 0;

  const approved =
    this.stages.filter(
      (s) => s.status === "approved"
    ).length;

  return Math.round(
    (approved / this.stages.length) * 100
  );
});

/* =================================
   PRE SAVE HOOKS
================================= */

// CALCULATE GLOBAL CONFIDENCE SCORE
VerificationSchema.pre(
  "save",
  function (next) {
    if (!this.stages.length) {
      this.overallConfidenceScore = 0;
      return next();
    }

    const total =
      this.stages.reduce(
        (sum, stage) =>
          sum + stage.confidenceScore,
        0
      );

    this.overallConfidenceScore =
      Math.round(
        total / this.stages.length
      );

    // BADGE LOGIC
    if (
      this.overallConfidenceScore >= 90
    ) {
      this.verificationBadgeLevel =
        "platinum";
    } else if (
      this.overallConfidenceScore >= 80
    ) {
      this.verificationBadgeLevel =
        "gold";
    } else if (
      this.overallConfidenceScore >= 70
    ) {
      this.verificationBadgeLevel =
        "silver";
    } else if (
      this.overallConfidenceScore >= 50
    ) {
      this.verificationBadgeLevel =
        "bronze";
    } else {
      this.verificationBadgeLevel =
        "none";
    }

    next();
  }
);

/* =================================
   INSTANCE METHODS
================================= */

// ADD STAGE
VerificationSchema.methods.addStage =
  async function (stageData) {
    this.stages.push(stageData);

    await this.save();

    return this;
  };

// UPDATE STAGE STATUS
VerificationSchema.methods.updateStageStatus =
  async function (
    stageId,
    status,
    confidenceScore = null
  ) {
    const stage =
      this.stages.id(stageId);

    if (!stage) return null;

    stage.status = status;

    if (
      confidenceScore !== null
    ) {
      stage.confidenceScore =
        confidenceScore;
    }

    stage.reviewedAt =
      new Date();

    await this.save();

    return stage;
  };

// ADD FRAUD SIGNAL
VerificationSchema.methods.addFraudSignal =
  async function (
    signal,
    severity = "medium"
  ) {
    this.fraudSignals.push({
      signal,
      severity,
    });

    if (
      severity === "high"
    ) {
      this.fraudRiskLevel =
        "high";
    }

    await this.save();
  };

// ASSIGN REVIEWER
VerificationSchema.methods.assignReviewer =
  async function (
    reviewerId
  ) {
    this.assignedReviewer =
      reviewerId;

    await this.save();
  };

// ADD HISTORY EVENT
VerificationSchema.methods.addHistoryEvent =
  async function (
    action,
    actorId,
    metadata = {}
  ) {
    this.history.push({
      action,
      actorId,
      metadata,
    });

    await this.save();
  };

// MARK VERIFIED
VerificationSchema.methods.markVerified =
  async function () {
    this.overallStatus =
      "verified";

    this.lastVerifiedAt =
      new Date();

    await this.save();
  };

// SOFT DELETE
VerificationSchema.methods.softDelete =
  async function () {
    this.isSoftDeleted = true;

    await this.save();
  };

// SAFE PUBLIC DATA
VerificationSchema.methods.getPublicVerification =
  function () {
    return {
      overallStatus:
        this.overallStatus,

      overallConfidenceScore:
        this.overallConfidenceScore,

      verificationBadgeLevel:
        this.verificationBadgeLevel,

      approvedStagesCount:
        this.approvedStagesCount,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND HIGH TRUST USERS
VerificationSchema.statics.findHighTrustUsers =
  async function () {
    return this.find({
      overallConfidenceScore: {
        $gte: 85,
      },

      overallStatus:
        "verified",

      isSoftDeleted: false,
    }).sort({
      overallConfidenceScore: -1,
    });
  };

// FIND REVIEW QUEUE
VerificationSchema.statics.findReviewQueue =
  async function () {
    return this.find({
      overallStatus:
        "under_review",
    }).sort({
      reviewPriority: -1,
      createdAt: 1,
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_Verification`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_Verification`,
    VerificationSchema
  );