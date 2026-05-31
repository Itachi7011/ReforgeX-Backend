const mongoose = require("mongoose");
const crypto = require("crypto");

/* =================================
   SUB SCHEMAS
================================= */

const EmploymentRecordSchema =
  new mongoose.Schema(
    {
      companyName: {
        type: String,
        required: true,
        trim: true,
      },

      companyDomain: {
        type: String,
        index: true,
      },

      role: {
        type: String,
        required: true,
      },

      employmentType: {
        type: String,
        enum: [
          "full_time",
          "part_time",
          "contract",
          "freelance",
          "internship",
        ],
        default: "full_time",
      },

      startDate: {
        type: Date,
        required: true,
      },

      endDate: Date,

      currentlyWorking: {
        type: Boolean,
        default: false,
      },

      layoffAffected: {
        type: Boolean,
        default: false,
      },

      layoffDate: Date,

      verified: {
        type: Boolean,
        default: false,
      },

      confidenceScore: {
        type: Number,
        default: 0,
      },
    },
    { _id: true }
  );

const WorkEmailVerificationSchema =
  new mongoose.Schema(
    {
      workEmail: {
        type: String,
        lowercase: true,
        trim: true,
      },

      companyDomainMatched: {
        type: Boolean,
        default: false,
      },

      emailVerificationToken: {
        type: String,
        select: false,
      },

      verifiedAt: Date,

      status: {
        type: String,
        enum: [
          "pending",
          "verified",
          "failed",
        ],
        default: "pending",
      },
    },
    { _id: false }
  );

const LinkedInVerificationSchema =
  new mongoose.Schema(
    {
      profileUrl: String,

      linkedinId: String,

      profileDataMatched: {
        type: Boolean,
        default: false,
      },

      experienceTimelineMatched: {
        type: Boolean,
        default: false,
      },

      companyMatched: {
        type: Boolean,
        default: false,
      },

      roleMatched: {
        type: Boolean,
        default: false,
      },

      confidenceScore: {
        type: Number,
        default: 0,
      },

      verifiedAt: Date,
    },
    { _id: false }
  );

const DocumentVerificationSchema =
  new mongoose.Schema(
    {
      documentType: {
        type: String,
        enum: [
          "payslip",
          "offer_letter",
          "experience_letter",
          "termination_letter",
        ],
      },

      documentHash: {
        type: String,
        select: false,
      },

      extractedMetadata: {
        companyName: String,
        employeeName: String,
        role: String,
        issueDate: Date,
      },

      aiDocumentConfidence: {
        type: Number,
        default: 0,
      },

      manuallyVerified: {
        type: Boolean,
        default: false,
      },

      verifiedAt: Date,
    },
    { _id: true }
  );

const PeerVerificationSchema =
  new mongoose.Schema(
    {
      verifierName: String,

      verifierLinkedIn: String,

      verifierCompany: String,

      relationshipType: {
        type: String,
        enum: [
          "manager",
          "coworker",
          "team_lead",
          "hr",
        ],
      },

      confidenceScore: {
        type: Number,
        default: 0,
      },

      notes: String,

      verifiedAt: Date,
    },
    { _id: true }
  );

/* =================================
   MAIN SCHEMA
================================= */

const EmploymentVerificationSchema =
  new mongoose.Schema(
    {
      /* =================================
         RELATIONS
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

      candidateProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: `${process.env.APP_NAME}_CandidateProfile`,
        required: true,
      },

      /* =================================
         EMPLOYMENT RECORDS
      ================================= */

      employmentRecords: [
        EmploymentRecordSchema,
      ],

      /* =================================
         VERIFICATION LAYERS
      ================================= */

      workEmailVerification:
        WorkEmailVerificationSchema,

      linkedinVerification:
        LinkedInVerificationSchema,

      documentVerifications: [
        DocumentVerificationSchema,
      ],

      peerVerifications: [
        PeerVerificationSchema,
      ],

      /* =================================
         GLOBAL STATUS
      ================================= */

      verificationStatus: {
        type: String,
        enum: [
          "pending",
          "submitted",
          "under_review",
          "verified",
          "partially_verified",
          "rejected",
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

      layoffAuthenticityScore: {
        type: Number,
        default: 0,
      },

      employmentAuthenticityScore: {
        type: Number,
        default: 0,
      },

      /* =================================
         CONSISTENCY CHECKS
      ================================= */

      consistencyChecks: {
        resumeMatched: {
          type: Boolean,
          default: false,
        },

        linkedinMatched: {
          type: Boolean,
          default: false,
        },

        timelineMatched: {
          type: Boolean,
          default: false,
        },

        salaryMetadataMatched: {
          type: Boolean,
          default: false,
        },

        roleMatched: {
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

      reviewerNotes: String,

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
         ANALYTICS
      ================================= */

      automatedChecksCount: {
        type: Number,
        default: 0,
      },

      manualReviewsCount: {
        type: Number,
        default: 0,
      },

      verificationAttempts: {
        type: Number,
        default: 0,
      },

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

// EmploymentVerificationSchema.index({
//   verificationStatus: 1,
// });

EmploymentVerificationSchema.index({
  overallConfidenceScore: -1,
});

// EmploymentVerificationSchema.index({
//   fraudRiskLevel: 1,
// });

EmploymentVerificationSchema.index({
  "employmentRecords.companyName": 1,
});

EmploymentVerificationSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

EmploymentVerificationSchema.virtual(
  "verifiedEmploymentCount"
).get(function () {
  return this.employmentRecords.filter(
    (record) => record.verified
  ).length;
});

/* =================================
   PRE SAVE HOOKS
================================= */

// CALCULATE GLOBAL CONFIDENCE SCORE
EmploymentVerificationSchema.pre(
  "save",
  function (next) {
    let score = 0;

    // WORK EMAIL
    if (
      this.workEmailVerification
        ?.status === "verified"
    ) {
      score += 25;
    }

    // LINKEDIN
    if (
      this.linkedinVerification
        ?.profileDataMatched
    ) {
      score += 20;
    }

    // DOCUMENTS
    score +=
      this.documentVerifications.length *
      10;

    // PEERS
    score +=
      this.peerVerifications.length *
      5;

    // TIMELINE MATCH
    if (
      this.consistencyChecks
        ?.timelineMatched
    ) {
      score += 15;
    }

    this.overallConfidenceScore =
      Math.min(score, 100);

    next();
  }
);

/* =================================
   INSTANCE METHODS
================================= */

// ADD EMPLOYMENT RECORD
EmploymentVerificationSchema.methods.addEmploymentRecord =
  async function (
    recordData
  ) {
    this.employmentRecords.push(
      recordData
    );

    await this.save();

    return this;
  };

// GENERATE WORK EMAIL TOKEN
EmploymentVerificationSchema.methods.generateWorkEmailToken =
  async function () {
    const token =
      crypto.randomBytes(32).toString(
        "hex"
      );

    this.workEmailVerification.emailVerificationToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    await this.save();

    return token;
  };

// VERIFY WORK EMAIL
EmploymentVerificationSchema.methods.verifyWorkEmail =
  async function () {
    this.workEmailVerification.status =
      "verified";

    this.workEmailVerification.verifiedAt =
      new Date();

    await this.save();
  };

// ADD DOCUMENT VERIFICATION
EmploymentVerificationSchema.methods.addDocumentVerification =
  async function (
    documentData
  ) {
    this.documentVerifications.push(
      documentData
    );

    await this.save();

    return this;
  };

// ADD PEER VERIFICATION
EmploymentVerificationSchema.methods.addPeerVerification =
  async function (
    peerData
  ) {
    this.peerVerifications.push(
      peerData
    );

    await this.save();

    return this;
  };

// ADD FRAUD SIGNAL
EmploymentVerificationSchema.methods.addFraudSignal =
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

// MARK VERIFIED
EmploymentVerificationSchema.methods.markVerified =
  async function () {
    this.verificationStatus =
      "verified";

    await this.save();
  };

// ADD AUDIT EVENT
EmploymentVerificationSchema.methods.addAuditEvent =
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
EmploymentVerificationSchema.methods.getPublicVerification =
  function () {
    return {
      verificationStatus:
        this.verificationStatus,

      overallConfidenceScore:
        this.overallConfidenceScore,

      verifiedEmploymentCount:
        this.verifiedEmploymentCount,

      layoffAuthenticityScore:
        this.layoffAuthenticityScore,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND VERIFIED ENGINEERS
EmploymentVerificationSchema.statics.findVerifiedEngineers =
  async function () {
    return this.find({
      verificationStatus:
        "verified",

      overallConfidenceScore: {
        $gte: 80,
      },

      isSoftDeleted: false,
    }).sort({
      overallConfidenceScore: -1,
    });
  };

// FIND HIGH RISK CASES
EmploymentVerificationSchema.statics.findHighRiskCases =
  async function () {
    return this.find({
      fraudRiskLevel: {
        $in: ["high", "critical"],
      },
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_EmploymentVerification`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_EmploymentVerification`,
    EmploymentVerificationSchema
  );