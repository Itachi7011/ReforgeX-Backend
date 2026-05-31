const mongoose = require("mongoose");
const crypto = require("crypto");

/* =================================
   SUB SCHEMAS
================================= */

const IdentityDocumentSchema =
  new mongoose.Schema(
    {
      documentType: {
        type: String,
        enum: [
          "passport",
          "drivers_license",
          "national_id",
          "aadhaar",
          "pan",
          "voter_id",
        ],
        required: true,
      },

      documentNumber: {
        type: String,
        required: true,
        select: false,
      },

      documentHash: {
        type: String,
        select: false,
      },

      issuingCountry: {
        type: String,
        required: true,
      },

      fullNameOnDocument: {
        type: String,
        required: true,
      },

      dateOfBirth: Date,

      expiryDate: Date,

      frontImage: {
        url: String,
        publicId: String,
      },

      backImage: {
        url: String,
        publicId: String,
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: true }
  );

const SelfieVerificationSchema =
  new mongoose.Schema(
    {
      selfieImage: {
        url: String,
        publicId: String,
      },

      faceMatchConfidence: {
        type: Number,
        default: 0,
      },

      livenessCheckPassed: {
        type: Boolean,
        default: false,
      },

      aiDetectionMetadata: {
        facialSimilarity: Number,
        spoofDetected: Boolean,
        multipleFacesDetected: Boolean,
      },

      verifiedAt: Date,
    },
    { _id: false }
  );

const ReviewerDecisionSchema =
  new mongoose.Schema(
    {
      reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
      },

      decision: {
        type: String,
        enum: [
          "approved",
          "rejected",
          "needs_resubmission",
        ],
      },

      confidenceScore: {
        type: Number,
        min: 0,
        max: 100,
      },

      notes: String,

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

const IdentityVerificationSchema =
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

      verificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_Verification`,
        required: true,
        index: true,
      },

      /* =================================
         IDENTITY DOCUMENTS
      ================================= */

      documents: [
        IdentityDocumentSchema,
      ],

      /* =================================
         SELFIE VERIFICATION
      ================================= */

      selfieVerification:
        SelfieVerificationSchema,

      /* =================================
         STATUS
      ================================= */

      verificationStatus: {
        type: String,
        enum: [
          "pending",
          "submitted",
          "under_review",
          "approved",
          "rejected",
          "resubmission_required",
        ],
        default: "pending",
        index: true,
      },

      verificationConfidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        index: true,
      },

      identityMatchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },

      /* =================================
         AUTOMATED CHECKS
      ================================= */

      automatedChecks: {
        duplicateIdentityDetected: {
          type: Boolean,
          default: false,
        },

        fakeDocumentDetected: {
          type: Boolean,
          default: false,
        },

        mismatchedIdentityDetected: {
          type: Boolean,
          default: false,
        },

        suspiciousMetadataDetected: {
          type: Boolean,
          default: false,
        },
      },

      /* =================================
         REVIEW SYSTEM
      ================================= */

      assignedReviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
      },

      reviewerDecision:
        ReviewerDecisionSchema,

      manualReviewRequired: {
        type: Boolean,
        default: false,
      },

      /* =================================
         FRAUD SYSTEM
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
         SYSTEM FLAGS
      ================================= */

      requiresReverification: {
        type: Boolean,
        default: false,
      },

      reverificationReason: String,

      lastVerifiedAt: Date,

      /* =================================
         AUDIT
      ================================= */

      submissionAttempts: {
        type: Number,
        default: 0,
      },

      auditTrail: [
        {
          action: String,

          actorId: {
            type:
              mongoose.Schema.Types.ObjectId,
            ref: `${process.env.APP_NAME}_User`,
          },

          metadata: Object,

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

// IdentityVerificationSchema.index({
//   verificationStatus: 1,
// });

IdentityVerificationSchema.index({
  verificationConfidence: -1,
});

// IdentityVerificationSchema.index({
//   fraudRiskLevel: 1,
// });

IdentityVerificationSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

IdentityVerificationSchema.virtual(
  "isVerified"
).get(function () {
  return (
    this.verificationStatus ===
    "approved"
  );
});

/* =================================
   PRE SAVE HOOKS
================================= */

// HASH DOCUMENT NUMBERS
IdentityVerificationSchema.pre(
  "save",
  function (next) {
    this.documents.forEach(
      (doc) => {
        if (
          doc.documentNumber &&
          !doc.documentHash
        ) {
          doc.documentHash =
            crypto
              .createHash("sha256")
              .update(
                doc.documentNumber
              )
              .digest("hex");
        }
      }
    );

    next();
  }
);

// AUTO DETECT MANUAL REVIEW
IdentityVerificationSchema.pre(
  "save",
  function (next) {
    const auto =
      this.automatedChecks;

    const suspicious =
      auto.duplicateIdentityDetected ||
      auto.fakeDocumentDetected ||
      auto.mismatchedIdentityDetected;

    this.manualReviewRequired =
      suspicious;

    if (suspicious) {
      this.fraudRiskLevel =
        "high";
    }

    next();
  }
);

/* =================================
   INSTANCE METHODS
================================= */

// ADD DOCUMENT
IdentityVerificationSchema.methods.addDocument =
  async function (documentData) {
    this.documents.push(
      documentData
    );

    this.submissionAttempts += 1;

    await this.save();

    return this;
  };

// ASSIGN REVIEWER
IdentityVerificationSchema.methods.assignReviewer =
  async function (
    reviewerId
  ) {
    this.assignedReviewer =
      reviewerId;

    this.verificationStatus =
      "under_review";

    await this.save();
  };

// APPROVE VERIFICATION
IdentityVerificationSchema.methods.approveVerification =
  async function (
    reviewerId,
    confidence = 95
  ) {
    this.verificationStatus =
      "approved";

    this.verificationConfidence =
      confidence;

    this.lastVerifiedAt =
      new Date();

    this.reviewerDecision = {
      reviewerId,
      decision: "approved",
      confidenceScore:
        confidence,
    };

    await this.save();
  };

// REJECT VERIFICATION
IdentityVerificationSchema.methods.rejectVerification =
  async function (
    reviewerId,
    notes = ""
  ) {
    this.verificationStatus =
      "rejected";

    this.reviewerDecision = {
      reviewerId,
      decision: "rejected",
      notes,
    };

    await this.save();
  };

// ADD FRAUD SIGNAL
IdentityVerificationSchema.methods.addFraudSignal =
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

// ADD AUDIT EVENT
IdentityVerificationSchema.methods.addAuditEvent =
  async function (
    action,
    actorId,
    metadata = {}
  ) {
    this.auditTrail.push({
      action,
      actorId,
      metadata,
    });

    await this.save();
  };

// SOFT DELETE
IdentityVerificationSchema.methods.softDelete =
  async function () {
    this.isSoftDeleted = true;

    await this.save();
  };

// SAFE PUBLIC DATA
IdentityVerificationSchema.methods.getPublicVerification =
  function () {
    return {
      verificationStatus:
        this.verificationStatus,

      verificationConfidence:
        this.verificationConfidence,

      fraudRiskLevel:
        this.fraudRiskLevel,

      lastVerifiedAt:
        this.lastVerifiedAt,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND HIGH RISK IDENTITIES
IdentityVerificationSchema.statics.findHighRisk =
  async function () {
    return this.find({
      fraudRiskLevel: {
        $in: ["high", "critical"],
      },

      isSoftDeleted: false,
    });
  };

// FIND REVIEW QUEUE
IdentityVerificationSchema.statics.findReviewQueue =
  async function () {
    return this.find({
      verificationStatus:
        "under_review",
    }).sort({
      createdAt: 1,
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_IdentityVerification`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_IdentityVerification`,
    IdentityVerificationSchema
  );