const mongoose = require("mongoose");

/* =================================
   SUB SCHEMAS
================================= */

const SkillSchema = new mongoose.Schema(
  {
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: `${process.env.APP_NAME}_Skill`,
    },

    skillName: {
      type: String,
      required: true,
      trim: true,
    },

    proficiency: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    yearsUsed: {
      type: Number,
      default: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const WorkExperienceSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companyDomain: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      required: true,
      trim: true,
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

    endDate: {
      type: Date,
      default: null,
    },

    currentlyWorking: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      maxlength: 3000,
      default: "",
    },

    layoffAffected: {
      type: Boolean,
      default: false,
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const EducationSchema = new mongoose.Schema(
  {
    institution: String,

    degree: String,

    field: String,

    startYear: Number,

    endYear: Number,
  },
  { _id: false }
);

/* =================================
   MAIN SCHEMA
================================= */

const CandidateProfileSchema = new mongoose.Schema(
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
       BASIC PROFILE
    ================================= */

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    headline: {
      type: String,
      maxlength: 200,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 3000,
      default: "",
    },

    profilePhoto: {
      url: String,
      publicId: String,
    },

    /* =================================
       LOCATION
    ================================= */

    currentLocation: {
      country: String,
      state: String,
      city: String,
      timezone: String,
    },

    /* =================================
       CAREER STATUS
    ================================= */

    openToWork: {
      type: Boolean,
      default: true,
      index: true,
    },

    layoffStatus: {
      type: String,
      enum: [
        "not_laid_off",
        "recently_laid_off",
        "actively_searching",
        "rehired",
      ],
      default: "actively_searching",
      index: true,
    },

    layoffDate: {
      type: Date,
      default: null,
    },

    yearsOfExperience: {
      type: Number,
      default: 0,
      index: true,
    },

    primaryRole: {
      type: String,
      required: true,
      index: true,
    },

    seniorityLevel: {
      type: String,
      enum: [
        "intern",
        "junior",
        "mid",
        "senior",
        "staff",
        "principal",
        "architect",
      ],
      default: "mid",
      index: true,
    },

    /* =================================
       SKILLS
    ================================= */

    skills: [SkillSchema],

    /* =================================
       EXPERIENCE
    ================================= */

    workExperience: [WorkExperienceSchema],

    education: [EducationSchema],

    /* =================================
       LINKS
    ================================= */

    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
      twitter: String,
    },

    resume: {
      url: String,
      publicId: String,
      uploadedAt: Date,
    },

    /* =================================
       AI METADATA
    ================================= */

    aiMetadata: {
      extractedSkills: [String],

      embeddingId: String,

      aiSummary: String,

      lastParsedAt: Date,

      confidenceScore: {
        type: Number,
        default: 0,
      },
    },

    /* =================================
       TRUST & VISIBILITY
    ================================= */

    visibility: {
      type: String,
      enum: ["public", "private", "verified_only"],
      default: "public",
      index: true,
    },

    profileStrength: {
      type: Number,
      default: 0,
    },

    trustScoreSnapshot: {
      type: Number,
      default: 0,
      index: true,
    },

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },

    featuredCandidate: {
      type: Boolean,
      default: false,
    },

    /* =================================
       ANALYTICS
    ================================= */

    analytics: {
      profileViews: {
        type: Number,
        default: 0,
      },

      recruiterViews: {
        type: Number,
        default: 0,
      },

      searchAppearances: {
        type: Number,
        default: 0,
      },
    },

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

CandidateProfileSchema.index({
  primaryRole: 1,
  seniorityLevel: 1,
});

CandidateProfileSchema.index({
  trustScoreSnapshot: -1,
});

CandidateProfileSchema.index({
  "skills.skillName": 1,
});

CandidateProfileSchema.index({
  layoffStatus: 1,
  openToWork: 1,
});

CandidateProfileSchema.index({
  createdAt: -1,
});

/* =================================
   VIRTUALS
================================= */

CandidateProfileSchema.virtual(
  "totalExperienceMonths"
).get(function () {
  let totalMonths = 0;

  this.workExperience.forEach((job) => {
    if (!job.startDate) return;

    const end = job.currentlyWorking
      ? new Date()
      : new Date(job.endDate);

    const months =
      (end.getFullYear() -
        new Date(job.startDate).getFullYear()) *
        12 +
      (end.getMonth() -
        new Date(job.startDate).getMonth());

    totalMonths += months;
  });

  return totalMonths;
});

CandidateProfileSchema.virtual(
  "verifiedSkillsCount"
).get(function () {
  return this.skills.filter(
    (skill) => skill.verified
  ).length;
});

/* =================================
   PRE SAVE HOOKS
================================= */

// CALCULATE PROFILE STRENGTH
CandidateProfileSchema.pre(
  "save",
  async function (next) {
    let strength = 0;

    if (this.bio) strength += 10;

    if (this.profilePhoto?.url) strength += 10;

    if (this.resume?.url) strength += 20;

    if (this.skills.length >= 5) strength += 20;

    if (this.workExperience.length >= 1)
      strength += 25;

    if (this.socialLinks.github)
      strength += 5;

    if (this.socialLinks.linkedin)
      strength += 10;

    this.profileStrength = Math.min(
      strength,
      100
    );

    this.isProfileCompleted =
      this.profileStrength >= 70;

    next();
  }
);

/* =================================
   INSTANCE METHODS
================================= */

// ADD SKILL
CandidateProfileSchema.methods.addSkill =
  async function (skillData) {
    this.skills.push(skillData);

    await this.save();

    return this;
  };

// REMOVE SKILL
CandidateProfileSchema.methods.removeSkill =
  async function (skillName) {
    this.skills = this.skills.filter(
      (skill) =>
        skill.skillName.toLowerCase() !==
        skillName.toLowerCase()
    );

    await this.save();

    return this;
  };

// UPDATE TRUST SNAPSHOT
CandidateProfileSchema.methods.updateTrustSnapshot =
  async function (score) {
    this.trustScoreSnapshot = score;

    await this.save();
  };

// MARK PROFILE FEATURED
CandidateProfileSchema.methods.markFeatured =
  async function () {
    this.featuredCandidate = true;

    await this.save();
  };

// SOFT DELETE
CandidateProfileSchema.methods.softDelete =
  async function () {
    this.isSoftDeleted = true;

    await this.save();
  };

// SAFE PUBLIC PROFILE
CandidateProfileSchema.methods.getPublicProfile =
  function () {
    return {
      id: this._id,

      fullName: this.fullName,

      headline: this.headline,

      primaryRole: this.primaryRole,

      seniorityLevel:
        this.seniorityLevel,

      yearsOfExperience:
        this.yearsOfExperience,

      profilePhoto:
        this.profilePhoto,

      skills: this.skills,

      trustScoreSnapshot:
        this.trustScoreSnapshot,

      profileStrength:
        this.profileStrength,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND TOP TALENT
CandidateProfileSchema.statics.findTopTalent =
  async function () {
    return this.find({
      openToWork: true,
      visibility: "public",
      isSoftDeleted: false,
    })
      .sort({
        trustScoreSnapshot: -1,
      })
      .limit(50);
  };

// FIND BY SKILL
CandidateProfileSchema.statics.findBySkill =
  async function (skillName) {
    return this.find({
      "skills.skillName": {
        $regex: skillName,
        $options: "i",
      },
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[
    `${process.env.APP_NAME}_CandidateProfile`
  ] ||
  mongoose.model(
    `${process.env.APP_NAME}_CandidateProfile`,
    CandidateProfileSchema
  );