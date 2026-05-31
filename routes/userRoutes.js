// routes/public.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
// const SubscriptionPlanDB = require('../models/SubscriptionPlans');
// const PrivacyPolicyDB = require('../models/PrivacyPolicy');
// const TermsOfServiceDB = require('../models/TermsOfService');
// const PlatFormSettingsDB = require('../models/Settings');
// const PublicEnquiryDB = require('../models/PublicEnquiry');
// const NotificationAlertDB = require('../models/NotificationAlert');


const AIInsightDB = require('../models/AIInsight');
const AuditLogDB = require('../models/AuditLog');
const CandidateProfileDB = require('../models/CandidateProfile');
const DocumentVerificationDB = require('../models/DocumentVerification');
const EmployerDB = require('../models/Employer');
const EmploymentVerificationDB = require('../models/EmploymentVerification');
const IdentityVerificationDB = require('../models/IdentityVerification');
const JobDB = require('../models/Job');
const LayoffEventDB = require('../models/LayoffEvent');
const MarketSignalDB = require('../models/MarketSignal');
const ProjectDB = require('../models/Project');
const SkillDB = require('../models/Skill');
const TalentGraphEdgeDB = require('../models/TalentGraphEdge');
const TalentGraphNodeDB = require('../models/TalentGraphNode');
const TrustScoreDB = require('../models/TrustScore');
const UserDB = require('../models/User');
const VerificationDB = require('../models/Verification');


const { body, validationResult } = require('express-validator');




module.exports = router;