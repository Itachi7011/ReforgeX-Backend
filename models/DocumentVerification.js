const mongoose = require("mongoose");
const crypto = require("crypto");

/* =================================
   SUB SCHEMAS
================================= */

const FileMetadataSchema =
  new mongoose.Schema(
    {
      originalFileName: String,

      mimeType: String,

      extension: String,

      sizeInBytes: Number,

      uploadedAt: {
        type: Date,
        default: Date.now,
      },

      uploadedByIp: String,

      storageProvider: {
        type: String,
        enum: [
          "cloudinary",
          "aws_s3",
          "local",
        ],
        default: "cloudinary",
      },

      storageLocation: String,
    },
    { _id: false }
  );

const OCRExtractionSchema =
  new mongoose.Schema(
    {
      extractedText: {
        type: String,
        select: false,
      },

      extractedEntities: {
        companyName: String,

        employeeName: String,

        designation: String,

        salary: String,

        issueDate: Date,

        joiningDate: Date,

        relievingDate: Date,

        documentNumber: String,
      },

      extractionConfidence: {
        type: Number,
        default: 0,
      },

      extractionEngine: {
        type: String,
        enum: [
          "google_vision",
          "aws_textract",
          "tesseract",
          "azure_form_recognizer",
        ],
      },

      extractedAt: Date,
    },
    { _id: false }
  );

const AuthenticityChecksSchema =
  new mongoose.Schema(
    {
      metadataIntegrityPassed: {
        type: Boolean,
        default: false,
      },

      tamperingDetected: {
        type: Boolean,
        default: false,
      },

      photoshopDetected: {
        type: Boolean,
        default: false,
      },

      suspiciousFontsDetected: {
        type: Boolean,
        default: false,
      },

      inconsistentMetadataDetected: {
        type: Boolean,
        default: false,
      },

      aiGeneratedProbability: {
        type: Number,
        default: 0,
      },

      authenticityConfidence: {
        type: Number,
        default: 0,
      },
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
        default: 0,
      },

      notes: String,

      reviewedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: false }
  );

/* =================================
   MAIN SCHEMA
================================= */

const DocumentVerificationSchema =
  new mongoose.Schema(
    {
      /* =================================
         RELATIONS
      ================================= */

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_User`,
        required: true,
        index: true,
      },

      verificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_Verification`,
        required: true,
        index: true,
      },

      employmentVerificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_EmploymentVerification`,
      },

      identityVerificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_IdentityVerification`,
      },

      /* =================================
         DOCUMENT TYPE
      ================================= */

      documentType: {
        type: String,
        enum: [
          "payslip",
          "offer_letter",
          "experience_letter",
          "termination_letter",
          "identity_document",
          "resume",
          "certificate",
        ],
        required: true,
        index: true,
      },

      /* =================================
         FILE DATA
      ================================= */

      file: {
        url: {
          type: String,
          required: true,
        },

        publicId: String,

        secureUrl: String,
      },

      fileMetadata:
        FileMetadataSchema,

      /* =================================
         DOCUMENT SECURITY
      ================================= */

      fileHash: {
        type: String,
        select: false,
        index: true,
      },

      checksumAlgorithm: {
        type: String,
        default: "sha256",
      },

      encrypted: {
        type: Boolean,
        default: false,
      },

      /* =================================
         OCR & AI EXTRACTION
      ================================= */

      ocrExtraction:
        OCRExtractionSchema,

      /* =================================
         AUTHENTICITY CHECKS
      ================================= */

      authenticityChecks:
        AuthenticityChecksSchema,

      /* =================================
         GLOBAL STATUS
      ================================= */

      verificationStatus: {
        type: String,
        enum: [
          "pending",
          "processing",
          "under_review",
          "verified",
          "rejected",
          "flagged",
        ],
        default: "pending",
        index: true,
      },

      overallConfidenceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
        index: true,
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
         FRAUD DETECTION
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
         PROCESSING METADATA
      ================================= */

      processingStartedAt: Date,

      processingCompletedAt: Date,

      processingDurationMs: Number,

      processingEngineVersion:
        String,

      /* =================================
         AUDIT
      ================================= */

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

// DocumentVerificationSchema.index({
//   verificationStatus: 1,
// });

// DocumentVerificationSchema.index({
//   documentType: 1,
// });

DocumentVerificationSchema.index({
  overallConfidenceScore: -1,
});

// DocumentVerificationSchema.index({
//   fraudRiskLevel: 1,
// });

DocumentVerificationSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

DocumentVerificationSchema.virtual(
  "isVerified"
).get(function () {
  return (
    this.verificationStatus ===
    "verified"
  );
});

/* =================================
   PRE SAVE HOOKS
================================= */

// GENERATE FILE HASH
DocumentVerificationSchema.pre(
  "save",
  function (next) {
    if (
      this.file?.url &&
      !this.fileHash
    ) {
      this.fileHash =
        crypto
          .createHash("sha256")
          .update(this.file.url)
          .digest("hex");
    }

    next();
  }
);

// DETERMINE MANUAL REVIEW
DocumentVerificationSchema.pre(
  "save",
  function (next) {
    const checks =
      this.authenticityChecks;

    if (!checks) return next();

    const suspicious =
      checks.tamperingDetected ||
      checks.photoshopDetected ||
      checks.inconsistentMetadataDetected ||
      checks.aiGeneratedProbability >
        70;

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

// START PROCESSING
DocumentVerificationSchema.methods.startProcessing =
  async function () {
    this.verificationStatus =
      "processing";

    this.processingStartedAt =
      new Date();

    await this.save();
  };

// COMPLETE PROCESSING
DocumentVerificationSchema.methods.completeProcessing =
  async function () {
    this.processingCompletedAt =
      new Date();

    this.processingDurationMs =
      this.processingCompletedAt -
      this.processingStartedAt;

    await this.save();
  };

// UPDATE OCR DATA
DocumentVerificationSchema.methods.updateOCRExtraction =
  async function (
    extractionData
  ) {
    this.ocrExtraction =
      extractionData;

    await this.save();
  };

// UPDATE AUTHENTICITY
DocumentVerificationSchema.methods.updateAuthenticityChecks =
  async function (
    checks
  ) {
    this.authenticityChecks =
      checks;

    await this.save();
  };

// ASSIGN REVIEWER
DocumentVerificationSchema.methods.assignReviewer =
  async function (
    reviewerId
  ) {
    this.assignedReviewer =
      reviewerId;

    this.verificationStatus =
      "under_review";

    await this.save();
  };

// APPROVE DOCUMENT
DocumentVerificationSchema.methods.approveDocument =
  async function (
    reviewerId,
    confidence = 95
  ) {
    this.verificationStatus =
      "verified";

    this.overallConfidenceScore =
      confidence;

    this.reviewerDecision = {
      reviewerId,
      decision: "approved",
      confidenceScore:
        confidence,
    };

    await this.save();
  };

// REJECT DOCUMENT
DocumentVerificationSchema.methods.rejectDocument =
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
DocumentVerificationSchema.methods.addFraudSignal =
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
DocumentVerificationSchema.methods.addAuditEvent =
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

// SAFE PUBLIC DATA
DocumentVerificationSchema.methods.getPublicVerification =
  function () {
    return {
      documentType:
        this.documentType,

      verificationStatus:
        this.verificationStatus,

      overallConfidenceScore:
        this.overallConfidenceScore,

      fraudRiskLevel:
        this.fraudRiskLevel,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND FLAGGED DOCUMENTS
DocumentVerificationSchema.statics.findFlaggedDocuments =
  async function () {
    return this.find({
      fraudRiskLevel: {
        $in: ["high", "critical"],
      },

      isSoftDeleted: false,
    });
  };

// FIND REVIEW QUEUE
DocumentVerificationSchema.statics.findReviewQueue =
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
    `${process.env.APP_NAME}_DocumentVerification`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_DocumentVerification`,
    DocumentVerificationSchema
  );