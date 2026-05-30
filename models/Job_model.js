const mongoose = require("mongoose");

/* =================================
   JOB MODEL (CORE DEMAND SIGNAL)
================================= */

const JobSchema = new mongoose.Schema(
  {
    /* =============================
       RELATIONS
    ============================= */

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_Employer`,
      required: true,
      index: true,
    },

    postedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_User`,
      required: true,
    },

    /* =============================
       JOB BASICS
    ============================= */

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "freelance"],
      default: "full_time",
      index: true,
    },

    workMode: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "remote",
      index: true,
    },

    location: {
      country: String,
      state: String,
      city: String,
    },

    /* =============================
       COMPENSATION
    ============================= */

    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "USD",
      },
    },

    equityOffered: {
      type: Boolean,
      default: false,
    },

    /* =============================
       REQUIREMENTS
    ============================= */

    requiredSkills: [
      {
        name: String,
        level: {
          type: Number,
          min: 1,
          max: 10,
        },
      },
    ],

    experienceLevel: {
      type: String,
      enum: ["junior", "mid", "senior", "staff", "lead", "principal"],
      index: true,
    },

    minExperienceYears: Number,

    /* =============================
       AI / MATCHING SIGNALS
    ============================= */

    embeddingVector: {
      type: [Number],
      default: [],
    },

    matchBoostScore: {
      type: Number,
      default: 0,
    },

    layoffRelevanceScore: {
      type: Number,
      default: 0,
    },

    demandStrengthScore: {
      type: Number,
      default: 0,
    },

    /* =============================
       TRUST SYSTEM
    ============================= */

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
      index: true,
    },

    employerTrustSnapshot: {
      type: Number,
      default: 0,
    },

    fraudRiskScore: {
      type: Number,
      default: 0,
    },

    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },

    flagReasons: [
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

    /* =============================
       STATUS LIFECYCLE
    ============================= */

    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed", "expired"],
      default: "draft",
      index: true,
    },

    publishedAt: Date,
    expiresAt: Date,

    /* =============================
       ENGAGEMENT
    ============================= */

    views: {
      type: Number,
      default: 0,
    },

    applicationsCount: {
      type: Number,
      default: 0,
    },

    savesCount: {
      type: Number,
      default: 0,
    },

    /* =============================
       AI INSIGHTS
    ============================= */

    aiSummary: String,

    recommendedCandidateTraits: [String],

    autoTagging: [String],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =================================
   INDEXES
================================= */

JobSchema.index({ title: "text", description: "text" });
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ employerId: 1, status: 1 });
JobSchema.index({ experienceLevel: 1, workMode: 1 });

/* =================================
   VIRTUALS
================================= */

JobSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

JobSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < Date.now();
});

/* =================================
   PRE SAVE HOOKS
================================= */

JobSchema.pre("save", function (next) {
  // auto expire logic
  if (this.status === "active" && !this.expiresAt) {
    const now = new Date();
    this.expiresAt = new Date(now.setMonth(now.getMonth() + 1));
  }

  next();
});

/* =================================
   INSTANCE METHODS
================================= */

// PUBLISH JOB
JobSchema.methods.publish = async function () {
  this.status = "active";
  this.publishedAt = new Date();
  await this.save();
};

// PAUSE JOB
JobSchema.methods.pause = async function () {
  this.status = "paused";
  await this.save();
};

// CLOSE JOB
JobSchema.methods.close = async function () {
  this.status = "closed";
  await this.save();
};

// INCREMENT VIEW
JobSchema.methods.incrementView = async function () {
  this.views += 1;
  await this.save();
};

// INCREMENT APPLICATIONS
JobSchema.methods.incrementApplications = async function () {
  this.applicationsCount += 1;
  await this.save();
};

// UPDATE MATCH SCORE
JobSchema.methods.updateMatchScore = async function (score) {
  this.matchBoostScore = score;
  await this.save();
};

// FLAG JOB
JobSchema.methods.flagJob = async function (reason, severity = "medium") {
  this.isFlagged = true;

  this.flagReasons.push({
    reason,
    severity,
  });

  await this.save();
};

/* =================================
   STATIC METHODS
================================= */

// FIND ACTIVE JOBS
JobSchema.statics.findActiveJobs = function () {
  return this.find({ status: "active" });
};

// FIND HIGH MATCH JOBS
JobSchema.statics.findHighMatchJobs = function () {
  return this.find({ matchBoostScore: { $gte: 70 } });
};

// FIND LAYOFF RELEVANT JOBS
JobSchema.statics.findLayoffFriendlyJobs = function () {
  return this.find({
    layoffRelevanceScore: { $gte: 60 },
  });
};

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[`${process.env.APP_NAME}_Job`] ||
  mongoose.model(`${process.env.APP_NAME}_Job`, JobSchema);