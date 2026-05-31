const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    /* =================================
       BASIC IDENTITY
    ================================= */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "candidate",
        "employer",
        "admin",
        "moderator",
        "reviewer",
      ],
      default: "candidate",
      index: true,
    },

    /* =================================
       AUTH PROVIDERS
    ================================= */

    authProvider: {
      type: String,
      enum: ["local", "google", "github", "linkedin"],
      default: "local",
    },

    providerId: {
      type: String,
      default: null,
      index: true,
    },

    socialLogins: {
      google: {
        id: String,
        email: String,
      },

      github: {
        id: String,
        username: String,
      },

      linkedin: {
        id: String,
        profileUrl: String,
      },
    },

    /* =================================
       ACCOUNT STATUS
    ================================= */

    accountStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "suspended",
        "blocked",
        "deleted",
      ],
      default: "pending",
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    /* =================================
       SECURITY
    ================================= */

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    /* =================================
       EMAIL VERIFICATION
    ================================= */

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    /* =================================
       PASSWORD RESET
    ================================= */

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    /* =================================
       TERMS & PRIVACY
    ================================= */

    termsAcceptedAt: {
      type: Date,
      default: Date.now,
    },

    privacyAcceptedAt: {
      type: Date,
      default: Date.now,
    },

    /* =================================
       AUDIT & SYSTEM
    ================================= */

    isSoftDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      signupIP: String,
      signupSource: String,
      deviceInfo: String,
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

UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, accountStatus: 1 });

/* =================================
   VIRTUALS
================================= */

UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.virtual("isActive").get(function () {
  return this.accountStatus === "active";
});

/* =================================
   PRE SAVE HOOKS
================================= */

// HASH PASSWORD
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(this.password, salt);

  this.passwordChangedAt = Date.now();

  next();
});

// NORMALIZE EMAIL
UserSchema.pre("save", function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  next();
});

/* =================================
   INSTANCE METHODS
================================= */

// COMPARE PASSWORD
UserSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// GENERATE EMAIL VERIFICATION TOKEN
UserSchema.methods.generateEmailVerificationToken =
  function () {
    const token = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    this.emailVerificationExpires =
      Date.now() + 1000 * 60 * 60; // 1 hour

    return token;
  };

// GENERATE RESET PASSWORD TOKEN
UserSchema.methods.generateResetPasswordToken =
  function () {
    const token = crypto.randomBytes(32).toString("hex");

    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    this.resetPasswordExpires =
      Date.now() + 1000 * 60 * 30; // 30 min

    return token;
  };

// HANDLE LOGIN ATTEMPTS
UserSchema.methods.incrementLoginAttempts =
  async function () {
    const MAX_ATTEMPTS = 5;

    const LOCK_TIME = 1000 * 60 * 60 * 2; // 2 hrs

    if (
      this.lockUntil &&
      this.lockUntil < Date.now()
    ) {
      this.loginAttempts = 1;
      this.lockUntil = null;
    } else {
      this.loginAttempts += 1;

      if (this.loginAttempts >= MAX_ATTEMPTS) {
        this.lockUntil = Date.now() + LOCK_TIME;
      }
    }

    await this.save();
  };

// RESET LOGIN ATTEMPTS
UserSchema.methods.resetLoginAttempts =
  async function () {
    this.loginAttempts = 0;

    this.lockUntil = null;

    await this.save();
  };

// UPDATE LAST LOGIN
UserSchema.methods.updateLastLogin =
  async function () {
    this.lastLoginAt = Date.now();

    await this.save();
  };

// SOFT DELETE ACCOUNT
UserSchema.methods.softDeleteAccount =
  async function () {
    this.isSoftDeleted = true;

    this.deletedAt = Date.now();

    this.accountStatus = "deleted";

    await this.save();
  };

// SAFE PUBLIC PROFILE
UserSchema.methods.getPublicProfile =
  function () {
    return {
      id: this._id,
      email: this.email,
      role: this.role,
      accountStatus: this.accountStatus,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt,
    };
  };

/* =================================
   STATIC METHODS
================================= */

// FIND BY EMAIL
UserSchema.statics.findByEmail =
  async function (email) {
    return this.findOne({
      email: email.toLowerCase(),
    }).select("+password");
  };

// FIND ACTIVE USER
UserSchema.statics.findActiveUser =
  async function (userId) {
    return this.findOne({
      _id: userId,
      accountStatus: "active",
      isSoftDeleted: false,
    });
  };

/* =================================
   EXPORT MODEL
================================= */

module.exports =
  mongoose.models[`${process.env.APP_NAME}_User`] ||
  mongoose.model(
    `${process.env.APP_NAME}_User`,
    UserSchema
  );