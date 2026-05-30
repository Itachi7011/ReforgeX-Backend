const mongoose = require("mongoose");
const crypto = require("crypto");

/* =================================
   SUB SCHEMAS
================================= */

const TeamMemberSchema = new mongoose.Schema(
  {
    name: String,

    email: String,

    role: {
      type: String,
      enum: [
        "owner",
        "admin",
        "recruiter",
        "viewer",
      ],
      default: "recruiter",
    },

    invitedAt: {
      type: Date,
      default: Date.now,
    },

    joinedAt: Date,
  },
  { _id: false }
);

const BillingSchema = new mongoose.Schema(
  {
    stripeCustomerId: String,

    subscriptionPlan: {
      type: String,
      enum: [
        "free",
        "starter",
        "growth",
        "enterprise",
      ],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "trialing",
        "past_due",
        "cancelled",
      ],
      default: "active",
    },

    currentPeriodEnd: Date,
  },
  { _id: false }
);

/* =================================
   MAIN SCHEMA
================================= */

const EmployerSchema = new mongoose.Schema(
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

    /* =================================
       COMPANY INFO
    ================================= */

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    companyWebsite: {
      type: String,
      default: "",
      trim: true,
    },

    companyDomain: {
      type: String,
      default: "",
      index: true,
    },

    companyIndustry: {
      type: String,
      default: "technology",
      index: true,
    },

    companyDescription: {
      type: String,
      maxlength: 5000,
      default: "",
    },

    companyLogo: {
      url: String,
      publicId: String,
    },

    foundedYear: Number,

    companySize: {
      type: String,
      enum: [
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1000+",
      ],
      default: "1-10",
      index: true,
    },

    headquarters: {
      country: String,
      state: String,
      city: String,
    },

    /* =================================
       RECRUITER TYPE
    ================================= */

    recruiterType: {
      type: String,
      enum: [
        "founder",
        "internal_hr",
        "agency",
        "technical_recruiter",
      ],
      required: true,
      index: true,
    },

    /* =================================
       HIRING STATUS
    ================================= */

    hiringStatus: {
      type: String,
      enum: [
        "actively_hiring",
        "occasionally_hiring",
        "not_hiring",
      ],
      default: "actively_hiring",
      index: true,
    },

    activeJobsCount: {
      type: Number,
      default: 0,
    },

    hiresMade: {
      type: Number,
      default: 0,
    },

    /* =================================
       TRUST & VERIFICATION
    ================================= */

    verifiedEmployer: {
      type: Boolean,
      default: false,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: [
        "pending",
        "verified",
        "rejected",
        "under_review",
      ],
      default: "pending",
      index: true,
    },

    trustLevel: {
      type: Number,
      default: 0,
      index: true,
    },

    recruiterReputationScore: {
      type: Number,
      default: 0,
    },

    fraudFlags: [
      {
        reason: String,

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

    /* =================================
       SOCIAL LINKS
    ================================= */

    socialLinks: {
      linkedin: String,
      twitter: String,
      github: String,
    },

    /* =================================
       TEAM MANAGEMENT
    ================================= */

    teamMembers: [TeamMemberSchema],

    /* =================================
       BILLING
    ================================= */

    billing: BillingSchema,

    /* =================================
       API ACCESS
    ================================= */

    apiKeys: [
      {
        key: {
          type: String,
          select: false,
        },

        label: String,

        createdAt: {
          type: Date,
          default: Date.now,
        },

        lastUsedAt: Date,

        revoked: {
          type: Boolean,
          default: false,
        },
      },
    ],

    /* =================================
       ANALYTICS
    ================================= */

    analytics: {
      totalProfileViews: {
        type: Number,
        default: 0,
      },

      totalCandidatesViewed: {
        type: Number,
        default: 0,
      },

      responseRate: {
        type: Number,
        default: 0,
      },
    },

    /* =================================
       MODERATION
    ================================= */

    moderationNotes: [
      {
        note: String,

        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: `${process.env.APP_NAME}_User`,
        },

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

EmployerSchema.index({
  companyName: 1,
});

EmployerSchema.index({
  companyDomain: 1,
});

EmployerSchema.index({
  recruiterType: 1,
  hiringStatus: 1,
});

EmployerSchema.index({
  verifiedEmployer: 1,
  trustLevel: -1,
});

EmployerSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

EmployerSchema.virtual(
  "isTrustedEmployer"
).get(function () {
  return (
    this.verifiedEmployer &&
    this.trustLevel >= 75
  );
});

EmployerSchema.virtual(
  "teamSize"
).get(function () {
  return this.teamMembers.length;
});

/* =================================
   PRE SAVE HOOKS
================================= */

// NORMALIZE COMPANY DOMAIN
EmployerSchema.pre("save", function (next) {
  if (this.companyWebsite) {
    try {
      const url = new URL(this.companyWebsite);

      this.companyDomain =
        url.hostname.replace("www.", "");
    } catch (err) {
      this.companyDomain = "";
    }
  }

  next();
});

/* =================================
   INSTANCE METHODS
================================= */

// GENERATE API KEY
EmployerSchema.methods.generateApiKey =
  async function (label = "default") {
    const apiKey =
      crypto.randomBytes(32).toString("hex");

    this.apiKeys.push({
      key: apiKey,
      label,
    });

    await this.save();

    return apiKey;
  };

// REVOKE API KEY
EmployerSchema.methods.revokeApiKey =
  async function (keyId) {
    const targetKey = this.apiKeys.id(keyId);

    if (!targetKey) return false;

    targetKey.revoked = true;

    await this.save();

    return true;
  };

// UPDATE TRUST LEVEL
EmployerSchema.methods.updateTrustLevel =
  async function (score) {
    this.trustLevel = score;

    await this.save();
  };

// ADD FRAUD FLAG
EmployerSchema.methods.addFraudFlag =
  async function (
    reason,
    severity = "medium"
  ) {
    this.fraudFlags.push({
      reason,
      severity,
    });

    await this.save();
  };

// VERIFY EMPLOYER
EmployerSchema.methods.verifyEmployer =
  async function () {
    this.verifiedEmployer = true;

    this.verificationStatus = "verified";

    await this.save();
  };

// SOFT DELETE
EmployerSchema.methods.softDelete =
  async function () {
    this.isSoftDeleted = true;

    await this.save();
  };

// SAFE PUBLIC DATA
EmployerSchema.methods.getPublicProfile =
  function () {
    return {
      id: this._id,

      companyName: this.companyName,

      companyLogo: this.companyLogo,

      companyIndustry:
        this.companyIndustry,

      companySize: this.companySize,

      hiringStatus: this.hiringStatus,

      verifiedEmployer:
        this.verifiedEmployer,

      trustLevel: this.trustLevel,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND TRUSTED EMPLOYERS
EmployerSchema.statics.findTrustedEmployers =
  async function () {
    return this.find({
      verifiedEmployer: true,
      trustLevel: {
        $gte: 70,
      },
      isSoftDeleted: false,
    }).sort({
      trustLevel: -1,
    });
  };

// FIND BY DOMAIN
EmployerSchema.statics.findByDomain =
  async function (domain) {
    return this.findOne({
      companyDomain: domain,
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_Employer`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_Employer`,
    EmployerSchema
  );