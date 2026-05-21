"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeApexFile = analyzeApexFile;
exports.findApexFile = findApexFile;
exports.analyzeFlowFile = analyzeFlowFile;
exports.analyzeValidationRuleFile = analyzeValidationRuleFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const apexParserMod = require('@apexdevtools/apex-parser');
const ApexParserFactory = apexParserMod.ApexParserFactory ?? apexParserMod.default?.ApexParserFactory;
const ApexParserBaseVisitor = apexParserMod.ApexParserBaseVisitor ?? apexParserMod.default?.ApexParserBaseVisitor;
// ---------------------------------------------------------------------------
// Standard Salesforce objects
// ---------------------------------------------------------------------------
const STANDARD_OBJECTS = new Set([
    'AcceptedEventRelation', 'Account', 'AccountBrand', 'AccountContactRelation', 'AccountCleanInfo', 'AccountContactRole', 'AccountInsight',
    'AccountOwnerSharingRule', 'AccountPartner', 'AccountRelationship', 'AccountRelationshipShareRule', 'AccountShare', 'AccountTag',
    'AccountTeamMember', 'AccountTerritoryAssignmentRule', 'AccountTerritoryAssignmentRuleItem', 'AccountTerritorySharingRule',
    'AccountUserTerritory2View', 'ActionCadence', 'ActionCadenceRule', 'ActionCadenceRuleCondition', 'ActionCadenceStep', 'ActionCadenceStepTracker',
    'ActionCadenceStepVariant', 'ActionCadenceTracker', 'ActionCdncStpMonthlyMetric', 'ActionLinkGroupTemplate', 'ActionLinkTemplate', 'ActionPlan',
    'ActionPlanItem', 'ActionPlanTemplate', 'ActionPlanTemplateItem', 'ActionPlanTemplateItemValue', 'ActionPlanTemplateVersion',
    'ActiveFeatureLicenseMetric', 'ActivePermSetLicenseMetric', 'ActiveProfileMetric', 'ActiveScratchOrg', 'ActivityHistory', 'ActivityMetric',
    'ActivityUsrConnectionStatus', 'AdCreativeSizeType', 'AdditionalNumber', 'Address', 'AdOrderItem', 'AdOrderLineAdTarget', 'AdProductTargetCategory',
    'AdQuote', 'AdQuoteLine', 'AdQuoteLineAdTarget', 'AdServer', 'AdServerAccount', 'AdServerUser', 'AdSpaceCreativeSizeType', 'AdSpaceGroupMember',
    'AdSpaceSpecification', 'AdTargetCategory', 'AdTargetCategorySegment', 'AgentWork', 'AgentWorkSkill', 'AIApplication', 'AIApplicationConfig',
    'AIInsightAction', 'AIInsightFeedback', 'AIInsightReason', 'AIInsightValue', 'AIRecordInsight', 'AllowedEmailDomain', 'AlternativePaymentMethod',
    'AnalyticsLicensedAsset', 'Announcement', 'ApexClass', 'ApexComponent', 'ApexLog', 'ApexPage', 'ApexPageInfo', 'ApexTestQueueItem',
    'ApexTestResult', 'ApexTestResultLimits', 'ApexTestRunResult', 'ApexTestSuite', 'ApexTrigger', 'ApexTypeImplementor (Beta)',
    'AppAnalyticsQueryRequest', 'AppDefinition', 'AppExtension', 'AppMenuItem', 'AppointmentAssignmentPolicy', 'AppointmentScheduleAggr',
    'AppointmentScheduleLog', 'AppointmentSchedulingPolicy', 'AppointmentTopicTimeSlot', 'Approval', 'AppTabMember', 'ApptBundleAggrDurDnscale',
    'ApptBundleAggrPolicy', 'ApptBundleConfig', 'ApptBundlePolicy', 'ApptBundlePolicySvcTerr', 'ApptBundlePropagatePolicy', 'ApptBundleRestrictPolicy',
    'ApptBundleSortPolicy', 'AppUsageAssignment', 'Article Type__DataCategorySelection', 'Asset', 'AssetAction', 'AssetActionSource',
    'AssetDowntimePeriod', 'AssetOwnerSharingRule', 'AssetRelationship', 'AssetShare', 'AssetStatePeriod', 'AssetTag', 'AssetTokenEvent',
    'AssetWarranty', 'AssignedResource', 'AssignmentRule', 'AssociatedLocation', 'AsyncApexJob', 'AsyncOperationLog', 'AttachedContentDocument',
    'AttachedContentNote', 'Attachment', 'Audience', 'AuraDefinition', 'AuraDefinitionBundle', 'AuraDefinitionBundleInfo', 'AuraDefinitionInfo',
    'AuthConfig', 'AuthConfigProviders', 'AuthorizationForm', 'AuthorizationFormConsent', 'AuthorizationFormDataUse', 'AuthorizationFormText',
    'AuthProvider', 'AuthSession', 'BackgroundOperation', 'BackgroundOperationResult', 'BatchApexErrorEvent', 'BillingPeriodItem', 'BillingPolicy',
    'BillingSchedule', 'BillingScheduleGroup', 'BillingTreatment', 'BillingTreatmentItem', 'Bookmark', 'BrandTemplate', 'BriefcaseAssignment',
    'BriefcaseDefinition', 'BriefcaseRule', 'BriefcaseRuleFilter', 'Budget', 'BudgetAllocation', 'BusinessBrand', 'BusinessHours', 'BusinessProcess',
    'BusinessProcessDefinition', 'BusinessProcessFeedback', 'BusinessProcessGroup', 'BuyerAccount', 'BuyerGroupMember', 'BuyerGroupPricebook',
    'CalcProcStepRelationship', 'CalculationMatrix', 'CalculationMatrixColumn', 'CalculationMatrixRow', 'CalculationMatrixVersion',
    'CalculationProcedure', 'CalculationProcedureStep', 'CalculationProcedureVariable', 'CalculationProcedureVersion', 'Calendar', 'CalendarView',
    'CallCenter', 'CallCenterRoutingMap', 'CallCoachConfigModifyEvent', 'CallCoachingMediaProvider', 'CallCtrAgentFavTrfrDest',
    'CallCtrAgentFavTrfrDestShare', 'CallDisposition', 'CallDispositionCategory', 'CallTemplate', 'Campaign', 'CampaignInfluence',
    'CampaignInfluenceModel', 'CampaignMember', 'CampaignMemberStatus', 'CampaignOwnerSharingRule', 'CampaignShare', 'CampaignTag',
    'CardPaymentMethod', 'CartCheckoutSession', 'CartDeliveryGroup', 'CartDeliveryGroupMethod', 'CartItem', 'CartItemPriceAdjustment', 'CartTax',
    'CartValidationOutput', 'Case', 'CaseArticle', 'CaseComment', 'CaseContactRole', 'CaseHistory', 'CaseMilestone', 'CaseOwnerSharingRule',
    'CaseRelatedIssue', 'CaseShare', 'CaseSolution', 'CaseStatus', 'CaseSubjectParticle', 'CaseTag', 'CaseTeamMember', 'CaseTeamRole',
    'CaseTeamTemplate', 'CaseTeamTemplateMember', 'CaseTeamTemplateRecord', 'CategoryData', 'CategoryNode', 'CategoryNodeLocalization',
    'ChangeRequest', 'ChangeRequestRelatedIssue', 'ChannelObjectLinkingRule', 'ChannelProgram', 'ChannelProgramLevel', 'ChannelProgramMember',
    'ChatterActivity', 'ChatterAnswersActivity', 'ChatterAnswersReputationLevel', 'ChatterConversation', 'ChatterConversationMember',
    'ChatterExtension', 'ChatterExtensionConfig', 'ChatterMessage', 'ClientBrowser', 'CollaborationGroup', 'CollaborationGroupMember',
    'CollaborationGroupMemberRequest', 'CollaborationGroupRecord', 'CollaborationInvitation', 'CollabDocumentMetric', 'CollabDocumentMetricRecord',
    'CollabTemplateMetric', 'CollabTemplateMetricRecord', 'CollabUserEngagementMetric', 'CollabUserEngmtRecordLink', 'ColorDefinition',
    'CombinedAttachment', 'CommerceEntitlementBuyerGroup', 'CommerceEntitlementPolicy', 'CommerceEntitlementPolicyShare', 'CommerceEntitlementProduct',
    'CommissionSchedule', 'CommissionScheduleAssignment', 'CommSubscription', 'CommSubscriptionChannelType', 'CommSubscriptionConsent',
    'CommSubscriptionTiming', 'Community (Zone)', 'ConnectedApplication', 'Consumption Rate', 'Consumption Schedule', 'Contact', 'ContactCleanInfo',
    'ContactDailyMetric', 'ContactMonthlyMetric', 'ContactPointAddress', 'ContactPointConsent', 'ContactPointEmail', 'ContactPointPhone',
    'ContactPointTypeConsent', 'ContactOwnerSharingRule', 'ContactRequest', 'ContactRequestShare', 'ContactShare', 'ContactSuggestionInsight',
    'ContactTag', 'ContentAsset', 'ContentBody', 'ContentDistribution', 'ContentDistributionView', 'ContentDocument', 'ContentDocumentHistory',
    'ContentDocumentLink', 'ContentDocumentListViewMapping', 'ContentDocumentSubscription', 'ContentFolder', 'ContentFolderItem', 'ContentFolderLink',
    'ContentFolderMember', 'ContentHubItem', 'ContentHubRepository', 'ContentNote', 'ContentNotification', 'ContentTagSubscription',
    'ContentUserSubscription', 'ContentVersion', 'ContentVersionComment', 'ContentVersionHistory', 'ContentVersionRating', 'ContentWorkspace',
    'ContentWorkspaceDoc', 'ContentWorkspaceMember', 'ContentWorkspacePermission', 'ContentWorkspaceSubscription', 'Contract', 'ContractContactRole',
    'ContractLineItem', 'ContractStatus', 'ContractTag', 'Conversation', 'ConversationContextEntry', 'ConversationEntry', 'ConversationParticipant',
    'CorsWhitelistEntry', 'Coupon', 'CreditMemo', 'CreditMemoAddressGroup', 'CreditMemoInvApplication', 'CreditMemoLine', 'Crisis', 'CronJobDetail',
    'CronTrigger', 'CspTrustedSite', 'CurrencyType', 'CustomBrand', 'CustomBrandAsset', 'CustomHelpMenuItem', 'CustomHelpMenuSection',
    'CustomHttpHeader', 'CustomNotificationType', 'CustomPermission', 'CustomPermissionDependency', 'Customer', 'DandBCompany', 'Dashboard',
    'DashboardComponent', 'DashboardTag', 'DataAssessmentFieldMetric', 'DataAssessmentMetric', 'DataAssessmentValueMetric', 'DatacloudCompany',
    'DatacloudContact', 'DatacloudDandBCompany', 'DatacloudOwnedEntity', 'DatacloudPurchaseUsage', 'DataIntegrationRecordPurchasePermission',
    'DatasetExport', 'DatasetExportPart', 'DataUseLegalBasis', 'DataUsePurpose', 'DatedConversionRate', 'DeclinedEventRelation', 'DelegatedAccount',
    'DeleteEvent', 'DigitalSignature', 'DigitalWallet', 'DirectMessage', 'Division', 'DivisionLocalization', 'Document', 'DocumentAttachmentMap',
    'DocumentRecipient', 'DocumentTag', 'Domain', 'DomainSite', 'DsarPolicy', 'DsarPolicyLog', 'DuplicateJob', 'DuplicateJobDefinition',
    'DuplicateJobMatchingRule', 'DuplicateJobMatchingRuleDefinition', 'DuplicateRecordItem', 'DuplicateRecordSet', 'DuplicateRule',
    'ElectronicMediaGroup', 'ElectronicMediaUse', 'EmailContent', 'EmailDomainFilter', 'EmailDomainKey', 'EmailMessage', 'EmailMessageRelation',
    'EmailRelay', 'EmailServicesAddress', 'EmailServicesFunction', 'EmailStatus', 'EmailTemplate', 'EmailTemplateMonthlyMetric', 'EmbeddedServiceDetail',
    'EmbeddedServiceLabel', 'Employee', 'EmployeeCrisisAssessment', 'EmpUserProvisioningProcess', 'EmpUserProvisionProcessErr', 'EngagementChannelType',
    'EnhancedLetterhead', 'Entitlement', 'EntitlementContact', 'EntitlementTemplate', 'EntityHistory', 'EntityMilestone', 'EntitySubscription',
    'EnvironmentHubMember', 'Event', 'EventLogFile', 'EventRelation', 'EventBusSubscriber', 'EventTag', 'EventWhoRelation', 'Expense', 'ExpenseReport',
    'ExpenseReportEntry', 'ExpressionFilter', 'ExpressionFilterCriteria', 'ExternalAccountHierarchy', 'ExternalAccountHierarchyHistory', 'ExternalDataSource',
    'ExternalDataUserAuth', 'ExternalSocialAccount', 'FeedAttachment', 'FeedComment', 'FeedItem', 'FeedLike', 'FeedPollChoice', 'FeedPollVote',
    'FeedPost', 'FeedRevision', 'feedSignal', 'FeedTrackedChange', 'FieldHistoryArchive', 'FieldChangeSnapshot', 'FieldPermissions',
    'FieldSecurityClassification', 'FieldServiceMobileSettings', 'FieldServiceOrgSettings', 'FiscalYearSettings', 'FlexQueueItem', 'FlowDefinitionView',
    'FlowInterview', 'FlowInterviewOwnerSharingRule', 'FlowInterviewShare', 'FlowOrchestrationInstance', 'FlowOrchestrationStageInstance',
    'FlowOrchestrationStepInstance', 'FlowOrchestrationWorkItem', 'FlowRecordRelation', 'FlowTestResult (Beta)', 'FlowTestView (Beta)', 'FlowStageRelation',
    'FlowVariableView', 'FlowVersionView', 'Folder', 'FolderedContentDocument', 'ForecastingAdjustment', 'ForecastingDisplayedFamily', 'ForecastingFact', 'ForecastingFilter', 'ForecastingFilterCondition', 'ForecastingItem',
    'ForecastingOwnerAdjustment', 'ForecastingQuota', 'ForecastingShare', 'ForecastingSourceDefinition', 'ForecastingType', 'ForecastingTypeSource',
    'ForecastingUserPreference', 'FormulaFunction', 'FormulaFunctionAllowedType', 'FormulaFunctionCategory', 'FulfillmentOrder',
    'FulfillmentOrderItemAdjustment', 'FulfillmentOrderItemTax', 'FulfillmentOrderLineItem', 'FunctionConnection', 'FunctionInvocationRequest',
    'FunctionReference', 'GtwyProvPaymentMethodType', 'Goal', 'GoalLink', 'GoogleDoc', 'Group', 'GroupMember', 'GuestBuyerProfile',
    'HashtagDefinition', 'HealthCareDiagnosis', 'HealthCareProcedure', 'Holiday', 'IconDefinition', 'Idea', 'IdeaComment', 'IdeaReputation',
    'IdeaReputationLevel', 'IdeaTheme', 'IdpEventLog', 'IframeWhiteListUrl', 'Image', 'Incident', 'Individual', 'IndividualHistory', 'IndividualShare',
    'InternalOrganizationUnit', 'Invoice', 'InvoiceAddressGroup', 'InvoiceLine', 'JobProfile', 'JobProfileQueueGroup', 'Knowledge__Feed', 'Knowledge__ka',
    'Knowledge__kav', 'Knowledge__DataCategorySelection', 'KnowledgeableUser', 'KnowledgeArticle', 'KnowledgeArticleVersion',
    'KnowledgeArticleVersionHistory', 'KnowledgeArticleViewStat', 'KnowledgeArticleVoteStat', 'LandingPage', 'Lead', 'LeadCleanInfo', 'LeadDailyMetric',
    'LeadMonthlyMetric', 'LeadOwnerSharingRule', 'LeadShare', 'LeadStatus', 'LeadTag', 'LearningContent', 'LegalEntity',
    'LicenseDefinitionCustomPermission (Developer Preview)', 'LightningExperienceTheme', 'LightningOnboardingConfig', 'LightningToggleMetrics',
    'LightningUsageByAppTypeMetrics', 'LightningUsageByBrowserMetrics', 'LightningUsageByPageMetrics', 'LightningUsageByFlexiPageMetrics',
    'LightningExitByPageMetrics', 'LinkedArticle', 'LinkedArticleFeed', 'LinkedArticleHistory', 'ListEmail', 'ListEmailIndividualRecipient',
    'ListEmailRecipientSource', 'ListView', 'ListViewChart', 'ListViewChartInstance', 'LiveAgentSession', 'LiveAgentSessionHistory',
    'LiveAgentSessionShare', 'LiveChatBlockingRule', 'LiveChatObjectAccessConfig', 'LiveChatObjectAccessDefinition', 'LiveChatButton',
    'LiveChatButtonDeployment', 'LiveChatButtonSkill', 'LiveChatDeployment', 'LiveChatSensitiveDataRule', 'LiveChatTranscript', 'LiveChatTranscriptEvent',
    'LiveChatTranscriptShare', 'LiveChatTranscriptSkill', 'LiveChatUserConfig', 'LiveChatUserConfigProfile', 'LiveChatUserConfigUser', 'LiveChatVisitor',
    'Location', 'LocationGroup', 'LocationGroupAssignment', 'LocationTrustMeasure', 'LocWaitlistMsgTemplate', 'LocationWaitlist', 'LocationWaitlistedParty',
    'LoginEvent', 'LoginGeo', 'LoginHistory', 'LoginIp', 'LogoutEventStream', 'LookedUpFromActivity', 'Macro', 'MacroInstruction', 'MacroUsage', 'MailmergeTemplate',
    'MaintenanceAsset', 'MaintenancePlan', 'MaintenanceWorkRule', 'ManagedContentInfo', 'MarketingForm', 'MarketingLink', 'MatchingRule',
    'MatchingRuleItem', 'MediaChannel', 'MediaContentTitle', 'MessagingChannel', 'MessagingChannelSkill', 'MessagingConfiguration',
    'MessagingDeliveryError', 'MessagingEndUser', 'MessagingLink', 'MessagingSession', 'MessagingTemplate', 'MetadataPackage', 'MetadataPackageVersion',
    'Metric', 'MetricDataLink', 'MilestoneType', 'MLField', 'MlIntentUtteranceSuggestion', 'MLPredictionDefinition', 'MLRecommendationDefinition',
    'MobileSecurityPolicy', 'MobileSecurityUserMetric', 'MobileSettingsAssignment', 'MobSecurityCertPinConfig', 'MobSecurityCertPinEvent',
    'MsgChannelLanguageKeyword', 'MyDomainDiscoverableLogin', 'MutingPermissionSet', 'Name', 'NamedCredential', 'NamespaceRegistry',
    'NavigationLinkSet', 'NavigationMenuItem', 'NavigationMenuItemLocalization', 'Network', 'NetworkActivityAudit', 'NetworkAffinity',
    'NetworkDiscoverableLogin', 'NetworkFeedResponseMetric', 'NetworkMember', 'NetworkMemberGroup', 'NetworkModeration', 'NetworkPageOverride',
    'NetworkSelfRegistration', 'NetworkUserHistoryRecent', 'Note', 'NoteAndAttachment', 'NoteTag', 'OauthCustomScope', 'OauthCustomScopeApp',
    'OauthToken', 'ObjectPermissions', 'ObjectTerritory2AssignmentRule', 'ObjectTerritory2AssignmentRuleItem', 'ObjectTerritory2Association',
    'OmniDataPack', 'OmniDataTransform', 'OmniDataTransformItem', 'OmniESignature', 'OmniInteractionConfig', 'OmniInteractionAccessConfig',
    'OmniProcess', 'OmniProcessCompilation', 'OmniProcessElement', 'OmniProcessTransientData', 'OmniScriptSavedSession', 'OmniSupervisorConfig',
    'OmniSupervisorConfigGroup', 'OmniSupervisorConfigProfile', 'OmniSupervisorConfigQueue', 'OmniSupervisorConfigSkill', 'OmniSupervisorConfigUser',
    'OmniUiCard', 'OpenActivity', 'OperatingHours', 'OperatingHoursHistory', 'OperatingHoursHoliday', 'Opportunity', 'OpportunityCompetitor',
    'OpportunityContactRole', 'OpportunityContactRoleSuggestionInsight', 'OpportunityFieldHistory', 'OpportunityHistory', 'OpportunityInsight',
    'OpportunityLineItem', 'OpportunityLineItemSchedule', 'OpportunityOwnerSharingRule', 'OpportunityPartner', 'OpportunityShare',
    'OpportunitySplit', 'OpportunitySplitType', 'OpportunityStage', 'OpportunityTag', 'OpportunityTeamMember', 'Order', 'OrderAction',
    'OrderAdjustmentGroup', 'OrderAdjustmentGroupSummary', 'OrderDeliveryGroup', 'OrderDeliveryGroupSummary', 'OrderDeliveryMethod',
    'OrderHistory', 'OrderItem', 'OrderItemAdjustmentLineItem', 'OrderItemAdjustmentLineSummary', 'OrderItemSummary', 'OrderItemSummaryChange',
    'OrderItemTaxLineItem', 'OrderItemTaxLineItemSummary', 'OrderItemType', 'OrderOwnerSharingRule', 'OrderPaymentSummary', 'OrderShare',
    'OrderStatus', 'OrderSummary', 'OrderSummaryRoutingSchedule', 'Organization', 'OrgDeleteRequest', 'OrgWideEmailAddress', 'OutOfOffice',
    'OutgoingEmail', 'OutgoingEmailRelation', 'OwnedContentDocument', 'OwnerChangeOptionInfo', 'PackageLicense', 'PackagePushError', 'PackagePushJob',
    'PackagePushRequest', 'PackageSubscriber', 'Partner', 'PartnerFundAllocation', 'PartnerFundClaim', 'PartnerFundRequest', 'PartnerMarketingBudget',
    'PartnerNetworkConnection', 'PartnerNetworkRecordConnection', 'PartnerNetworkSyncLog', 'PartnerRole', 'PartyConsent', 'Payment',
    'PaymentAuthAdjustment', 'PaymentAuthorization', 'PaymentGateway', 'PaymentGatewayLog', 'PaymentGatewayProvider', 'PaymentGroup',
    'PaymentLineInvoice', 'PaymentMethod', 'PaymentTerm', 'PaymentTermItem', 'PaymentSchedule', 'PaymentScheduleItem', 'PendingServiceRouting',
    'PendingServiceRoutingInteractionInfo', 'Period', 'PermissionSet', 'PermissionSetAssignment', 'PermissionSetGroup', 'PermissionSetGroupComponent',
    'PermissionSetLicense', 'PermissionSetLicenseAssign', 'PermissionSetLicenseDefinition (Developer Preview)', 'PermissionSetTabSetting',
    'PersonalizationTargetInfo', 'PersonTraining', 'PicklistValueInfo', 'PipelineInspectionListView', 'PipelineInspMetricConfig',
    'PipelineInspMetricConfigLocalization', 'PlatformAction', 'PlatformEventUsageMetric', 'PlatformStatusAlertEvent', 'PortalDelegablePermissionSet',
    'PresenceConfigDeclineReason', 'PresenceDeclineReason', 'PresenceUserConfig', 'PresenceUserConfigProfile', 'PresenceUserConfigUser',
    'PriceAdjustmentSchedule', 'PriceAdjustmentTier', 'Pricebook2', 'Pricebook2History', 'PricebookEntry', 'PricebookEntryAdjustment', 'PrivacyRequest',
    'Problem', 'ProcessDefinition', 'ProcessException', 'ProcessInstance', 'ProcessInstanceHistory', 'ProcessInstanceStep', 'ProcessInstanceNode',
    'ProcessInstanceWorkitem', 'ProcessNode', 'ProducerCommission', 'Product2', 'Product2DataTranslation', 'ProductAttribute', 'ProductAttributeSet',
    'ProductAttributeSetItem', 'ProductAttributeSetProduct', 'ProductCatalog', 'ProductCategory', 'ProductCategoryProduct',
    'ProductCategoryDataTranslation', 'ProductConsumed', 'ProductEntitlementTemplate', 'ProductItem', 'ProductItemTransaction', 'ProductMedia',
    'ProductRequest', 'ProductRequestLineItem', 'ProductRequired', 'ProductSellingModelOption', 'ProductServiceCampaign',
    'ProductServiceCampaignItem', 'ProductServiceCampaignItemStatus', 'ProductServiceCampaignStatus', 'ProductTransfer', 'ProductWarrantyTerm',
    'Profile', 'ProductSellingModel', 'ProfileSkill', 'ProfileSkillEndorsement', 'ProfileSkillShare', 'ProfileSkillUser', 'Promotion',
    'PromotionMarketSegment', 'PromotionQualifier', 'PromotionSegment', 'PromotionSegmentBuyerGroup', 'PromotionSegmentSalesStore',
    'PromotionTarget', 'Prompt', 'PromptAction', 'PromptError', 'PromptActionOwnerSharingRule', 'PromptActionShare', 'PromptLocalization',
    'PromptVersion', 'PromptVersionLocalization', 'ProrationPolicy', 'PushTopic', 'QueueRoutingConfig', 'Question', 'QuestionDataCategorySelection',
    'QuestionReportAbuse', 'QuestionSubscription', 'QueueSobject', 'QuickText', 'QuickTextUsage', 'Quote', 'QuoteDocument', 'QuoteLineItem',
    'QuoteItemTaxItem', 'RecentFieldChange', 'RecentlyViewed', 'Recommendation', 'RecordAction', 'RecordActionHistory', 'RecordsetFilterCriteria',
    'RecordsetFilterCriteriaRule', 'RecordType', 'RecordTypeLocalization', 'RecordVisibility (Pilot)', 'RedirectWhitelistUrl', 'Refund',
    'RefundLinePayment', 'RegisteredExternalService', 'RelatedListColumnDefinition', 'RelatedListDefinition', 'RemoteKeyCalloutEvent', 'Reply',
    'ReplyReportAbuse', 'ReplyText', 'Report', 'ReportTag', 'ReputationLevel', 'ReputationLevelLocalization', 'ReputationPointsRule',
    'ResourceAbsence', 'ResourcePreference', 'ReturnOrder', 'ReturnOrderItemAdjustment', 'ReturnOrderItemTax', 'ReturnOrderLineItem',
    'ReturnOrderOwnerSharingRule', 'RevenueTransactionErrorLog', 'RuleTerritory2Association', 'SalesAIScoreCycle', 'SalesAIScoreModelFactor',
    'SalesChannel', 'SalesStoreCatalog', 'SalesWorkQueueSettings', 'SamlSsoConfig', 'SchedulingAdherenceDetail', 'SchedulingAdherenceSummary',
    'SchedulingConstraint', 'SchedulingObjective', 'SchedulingRule', 'SchedulingRuleParameter', 'Scontrol', 'ScontrolLocalization', 'Scorecard',
    'ScorecardAssociation', 'ScorecardMetric', 'ScratchOrgInfo', 'SearchPromotionRule', 'SecurityCustomBaseline', 'SelfServiceUser', 'Seller',
    'ServiceAppointment', 'ServiceAppointmentStatus', 'ServiceChannel', 'ServiceChannelFieldPriority', 'ServiceChannelStatus',
    'ServiceChannelStatusField', 'ServiceContract', 'ServiceContractOwnerSharingRule', 'ServiceCrew',
    'ServiceCrewMember', 'ServiceCrewOwnerSharingRule', 'ServicePresenceStatus', 'ServiceReport', 'ServiceReportLayout', 'ServiceResource',
    'ServiceResourceCapacity', 'ServiceResourceCapacityHistory', 'ServiceResourceOwnerSharingRule', 'ServiceResourcePreference',
    'ServiceResourceSkill', 'ServiceSetupProvisioning', 'ServiceTerritory', 'ServiceTerritoryLocation', 'ServiceTerritoryMember',
    'ServiceTerritoryWorkType', 'SessionPermSetActivation', 'SetupAuditTrail', 'SetupEntityAccess', 'ShapeRepresentation', 'SharingRecordCollection',
    'SharingRecordCollectionItem', 'SharingRecordCollectionMember', 'Shift', 'ShiftHistory', 'ShiftOwnerSharingRule', 'ShiftPattern',
    'ShiftPatternEntry', 'ShiftSegment', 'ShiftSegmentType', 'ShiftShare', 'ShiftStatus', 'ShiftTemplate', 'Shipment', 'ShipmentItem',
    'SignupRequest', 'Site', 'SiteDetail', 'SiteDomain', 'SiteHistory', 'SiteIframeWhitelistUrl', 'SiteRedirectMapping', 'Skill',
    'SkillLevelDefinition', 'SkillLevelProgress', 'SkillProfile', 'SkillRequirement', 'SkillUser', 'SlaProcess', 'Snippet', 'SnippetAssignment',
    'SocialPersona', 'SocialPost', 'Solution', 'SolutionStatus', 'SolutionTag', 'SOSDeployment', 'SOSSession', 'SOSSessionActivity', 'Stamp',
    'StampAssignment', 'StaticResource', 'StoreIntegratedService', 'StreamingChannel', 'Salesforce Surveys Object Model', 'Survey',
    'SurveyEmailBranding', 'SurveyEngagementContext', 'SurveyInvitation', 'SurveyPage', 'SurveyQuestion', 'SurveyQuestionChoice',
    'SurveyQuestionResponse', 'SurveyQuestionScore', 'SurveyResponse', 'SurveySubject', 'SurveyVersion', 'SurveyVersionAddlInfo', 'SvcCatalogRequest',
    'SvcCatalogReqRelatedItem', 'TabDefinition', 'TagDefinition', 'Task', 'TaskPriority', 'TaskRelation', 'TaskStatus', 'TaskTag', 'TaskWhoRelation',
    'TaxEngine', 'TaxEngineInteractionLog', 'TaxEngineProvider', 'TaxPolicy', 'TaxTreatment', 'TenantSecret', 'TenantSecurityAlertRuleSelectedTenant',
    'TenantSecurityApiAnomaly', 'TenantSecurityConnectedApp', 'TenantSecurityCredentialStuffing', 'TenantSecurityHealthCheckBaselineTrend',
    'TenantSecurityHealthCheckDetail', 'TenantSecurityHealthCheckTrend', 'TenantSecurityLogin', 'TenantSecurityMobilePolicyTrend',
    'TenantSecurityMonitorMetric', 'TenantSecurityNotification', 'TenantSecurityNotificationRule', 'TenantSecurityPackage', 'TenantSecurityPolicy',
    'TenantSecurityPolicyDeployment', 'TenantSecurityPolicySelectedTenant', 'TenantSecurityReportAnomaly', 'TenantSecuritySessionHijacking',
    'TenantSecurityTransactionPolicyTrend', 'TenantSecurityTrustedIpRangeTrend', 'TenantSecurityUserActivity', 'TenantSecurityUserPerm', 'Territory',
    'Territory2', 'Territory2AlignmentLog', 'Territory2Model', 'Territory2ModelHistory', 'Territory2ObjectExclusion', 'Territory2Type',
    'TestSuiteMembership', 'ThirdPartyAccountLink', 'ThreatDetectionFeedback', 'TimeSheet', 'TimeSheetEntry', 'TimeSlot', 'TimeSlotHistory',
    'Topic', 'TopicAssignment', 'TopicLocalization', 'TopicUserEvent', 'TransactionSecurityPolicy', 'Translation', 'TwoFactorInfo',
    'TwoFactorMethodsInfo', 'TwoFactorTempCode', 'UiFormulaCriterion', 'UiFormulaRule', 'UndecidedEventRelation', 'User', 'UserAccountTeamMember',
    'UserAppInfo', 'UserAppMenuCustomization', 'UserAppMenuItem', 'UserAuthCertificate', 'UserConfigTransferButton', 'UserConfigTransferSkill',
    'UserCustomBadge', 'UserCustomBadgeLocalization', 'UserDailyMetric', 'UserDailyMetricOwnerSharingRule', 'UserDevice', 'UserDeviceApplication',
    'UserDeviceHistory', 'UserEmailCalendarSync', 'UserEmailPreferredPerson', 'UserEmailPreferredPersonShare', 'UserLicense', 'UserListView',
    'UserListViewCriterion', 'UserLogin', 'UserMembershipSharingRule', 'UserMonthlyMetric', 'UserMonthlyMetricOwnerSharingRule', 'UserPackageLicense',
    'UserPermissionAccess', 'UserPrioritizedRecord', 'UserPreference', 'UserProfile', 'UserProvAccount', 'UserProvAccountStaging', 'UserProvMockTarget',
    'UserProvisioningConfig', 'UserProvisioningLog', 'UserProvisioningRequest', 'UserRecordAccess', 'UserRole', 'UserServicePresence', 'UserShare',
    'UserTeamMember', 'UserTerritory', 'UserTerritory2Association', 'UserWorkList', 'UserWorkListItem', 'VendorCallCenterStatusMap',
    'VerificationHistory', 'VisualforceAccessMetrics', 'VideoCall', 'VideoCallParticipant', 'VideoCallRecording', 'VoiceCall', 'VoiceCallList',
    'VoiceCallListItem', 'VoiceCallQualityFeedback', 'VoiceCallRecording', 'VoiceCoaching', 'VoiceLocalPresenceNumber', 'VoiceMailContent',
    'VoiceMailGreeting', 'VoiceMailMessage', 'VoiceUserLine', 'VoiceUserPreferences', 'VoiceVendorInfo', 'VoiceVendorLine', 'Vote', 'WarrantyTerm',
    'WaveAutoInstallRequest', 'WebCart', 'WebCartAdjustmentGroup', 'WebCartHistory', 'WebLink', 'WebLinkLocalization', 'WebStore', 'WebStoreCatalog',
    'WebStorePricebook', 'Wishlist', 'WishlistItem', 'WorkAccess', 'WorkAccessShare', 'WorkBadge', 'WorkBadgeDefinition', 'WorkCoaching',
    'WorkDemographic', 'WorkFeedback', 'WorkFeedbackQuestion', 'WorkFeedbackQuestionSet', 'WorkFeedbackRequest', 'WorkforceCapacity',
    'WorkforceCapacityUnit', 'WorkGoal', 'WorkGoalCollaborator', 'WorkGoalCollaboratorHistory', 'WorkGoalHistory', 'WorkGoalLink', 'WorkGoalShare',
    'Workload', 'WorkloadUnit', 'WorkOrder', 'WorkOrderHistory', 'WorkOrderLineItem', 'WorkOrderLineItemHistory', 'WorkOrderLineItemStatus',
    'WorkOrderShare', 'WorkOrderStatus', 'WorkPerformanceCycle', 'WorkPlan', 'WorkPlanSelectionRule', 'WorkPlanTemplate', 'WorkPlanTemplateEntry',
    'WorkReward', 'WorkRewardFund', 'WorkRewardFundType', 'WorkStep', 'WorkStepStatus', 'WorkStepTemplate', 'WorkThanks', 'WorkType', 'WorkTypeGroup',
    'WorkTypeGroupMember',
]);
// ---------------------------------------------------------------------------
// System types — never emitted as dependencies (case-insensitive check)
// ---------------------------------------------------------------------------
const SYSTEM_TYPES_LOWER = new Set([
    'string', 'integer', 'long', 'double', 'decimal', 'boolean',
    'date', 'datetime', 'time', 'blob', 'id', 'object', 'void',
    'list', 'set', 'map', 'iterable', 'iterator',
    'system', 'database', 'schema', 'limits', 'math', 'json',
    'userinfo', 'apexpages', 'messaging', 'connectapi', 'eventbus',
    'crypto', 'encodingutil', 'url', 'label', 'type',
    'http', 'httprequest', 'httpresponse',
    'restcontext', 'restrequest', 'restresponse',
    'test', 'assert',
    'sobject', 'exception', 'apexexception', 'dmlexception',
    'queryexception', 'listexception', 'calloutexception',
    'noclassexception', 'nosuchmethodexception',
    'xmlstreamreader', 'xmlstreamwriter',
    'flow', 'process', 'trigger', 'triggeroperation',
    'null', 'true', 'false', 'this', 'super',
    'insert', 'update', 'delete', 'upsert', 'merge', 'undelete',
]);
function isSystemType(name) {
    return SYSTEM_TYPES_LOWER.has(name.toLowerCase());
}
function isStandardObject(name) {
    return STANDARD_OBJECTS.has(name);
}
function isCustomSuffix(name) {
    const lower = name.toLowerCase();
    return (lower.endsWith('__c') || lower.endsWith('__r') ||
        lower.endsWith('__pc') || lower.endsWith('__mdt') ||
        lower.endsWith('__e') || lower.endsWith('__b') ||
        lower.endsWith('__x') || lower.endsWith('__kav') ||
        lower.endsWith('__ka') || lower.endsWith('__share') ||
        lower.endsWith('__history') || lower.endsWith('__feed'));
}
function isCustomField(name) {
    return /__(c|r|pc)$/i.test(name);
}
function classifySymbol(name) {
    if (!name || name.length === 0)
        return null;
    if (isSystemType(name))
        return null;
    if (isCustomSuffix(name))
        return 'CustomObject';
    if (isStandardObject(name))
        return 'StandardObject';
    return 'ApexClass';
}
function deduplicateDeps(deps) {
    const seen = new Set();
    return deps.filter((d) => {
        const key = `${d.type}:${d.apiName}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
// ---------------------------------------------------------------------------
// Public: analyzeApexFile
// ---------------------------------------------------------------------------
function analyzeApexFile(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const source = fs.readFileSync(filePath, 'utf-8');
    try {
        const isTrigger = filePath.endsWith('.trigger');
        const parserFactory = new ApexParserFactory();
        const parser = parserFactory.createParser(source);
        const tree = isTrigger ? parser.triggerUnit() : parser.compilationUnit();
        const visitor = buildVisitor();
        visitor.visit(tree);
        return deduplicateDeps(visitor.deps);
    }
    catch (err) {
        console.warn(`[textAnalyzer] Parse error in ${filePath}: ${err.message}`);
        return [];
    }
}
// ---------------------------------------------------------------------------
// Visitor — built against exact grammar rule names from BaseApexParser.g4
//
// Key grammar facts (verified from source):
//
//   classDeclaration : CLASS id (EXTENDS typeRef)? (IMPLEMENTS typeList)? classBody
//   typeList         : typeRef (COMMA typeRef)*
//   typeRef          : typeName (DOT typeName)* arraySubscripts
//   typeName         : LIST | SET | MAP | id  (with optional typeArguments)
//
//   fieldDeclaration           : typeRef variableDeclarators SEMI
//   localVariableDeclaration   : modifier* typeRef variableDeclarators
//   variableDeclarator         : id (ASSIGN expression)?
//   formalParameter            : modifier* typeRef id
//
//   methodDeclaration : (typeRef|VOID) id formalParameters (block|SEMI)
//
//   expression (labelled alternatives — visitor method = label name):
//     primary                          → visitPrimaryExpression
//     expression DOT dotMethodCall     → visitDotExpression   ← BOTH field access AND method calls
//     expression DOT anyId             → visitDotExpression
//     NEW creator                      → visitNewExpression
//     LPAREN typeRef RPAREN expression → visitCastExpression
//
//   creator      : createdName (noRest|classCreatorRest|arrayCreatorRest|...)
//   createdName  : idCreatedNamePair (DOT idCreatedNamePair)*
//   idCreatedNamePair : anyId (LT typeList GT)?
//
//   soqlLiteral   : LBRACK query RBRACK                    → visitSoqlLiteral
//   query         : SELECT selectList FROM fromNameList ... → visitQuery
//   fromNameList  : fieldName soqlId? (COMMA fieldName soqlId?)*
//   fieldName     : soqlId (DOT soqlId)*
//   selectList    : selectEntry (COMMA selectEntry)*
//   selectEntry   : fieldName soqlId? | soqlFunction ... | subQuery | typeOf
//
// IMPORTANT: There is NO separate visitFieldAccess rule.
// Field access lives inside visitDotExpression (the labelled alternative).
// We handle both cases there by checking whether the right child is
// dotMethodCall (method call) or anyId (field/property access).
// ---------------------------------------------------------------------------
function buildVisitor() {
    class DependencyVisitor extends ApexParserBaseVisitor {
        constructor() {
            super(...arguments);
            this.deps = [];
            // Tracks variable name → declared type for field access resolution
            this.varTypes = new Map();
        }
        // -----------------------------------------------------------------------
        // classDeclaration : CLASS id (EXTENDS typeRef)? (IMPLEMENTS typeList)? classBody
        // -----------------------------------------------------------------------
        visitClassDeclaration(ctx) {
            // extends — ctx.typeRef() returns the extends typeRef (single, may be undefined)
            const extendsRef = ctx.typeRef?.();
            if (extendsRef && !Array.isArray(extendsRef)) {
                const name = this.extractTypeRefName(extendsRef);
                if (name && classifySymbol(name) === 'ApexClass') {
                    this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Extends' });
                }
            }
            // implements — ctx.typeList() holds typeList rule which contains typeRef()*
            const typeList = ctx.typeList?.();
            if (typeList) {
                const typeRefs = typeList.typeRef?.();
                const refs = Array.isArray(typeRefs) ? typeRefs : typeRefs ? [typeRefs] : [];
                for (const ref of refs) {
                    const name = this.extractTypeRefName(ref);
                    if (name && classifySymbol(name) === 'ApexClass') {
                        this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Implements' });
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // fieldDeclaration : typeRef variableDeclarators SEMI
        // localVariableDeclaration : modifier* typeRef variableDeclarators
        // -----------------------------------------------------------------------
        visitFieldDeclaration(ctx) {
            this.handleTypedDeclaration(ctx);
            return this.visitChildren(ctx);
        }
        visitLocalVariableDeclaration(ctx) {
            this.handleTypedDeclaration(ctx);
            return this.visitChildren(ctx);
        }
        handleTypedDeclaration(ctx) {
            const typeRef = ctx.typeRef?.();
            if (!typeRef)
                return;
            const typeName = this.extractTypeRefName(typeRef);
            if (!typeName)
                return;
            const kind = classifySymbol(typeName);
            if (kind) {
                this.deps.push({ type: kind, apiName: typeName, referenceType: 'TypeDeclaration' });
            }
            // Record variable → type for field access resolution
            // variableDeclarators → variableDeclarator*
            const varDeclarators = ctx.variableDeclarators?.();
            if (varDeclarators) {
                const decls = varDeclarators.variableDeclarator?.();
                const declList = Array.isArray(decls) ? decls : decls ? [decls] : [];
                for (const decl of declList) {
                    const idNode = decl.id?.();
                    if (idNode && typeName) {
                        this.varTypes.set(idNode.getText(), typeName);
                    }
                }
            }
        }
        // -----------------------------------------------------------------------
        // methodDeclaration : (typeRef|VOID) id formalParameters (block|SEMI)
        // -----------------------------------------------------------------------
        visitMethodDeclaration(ctx) {
            const typeRef = ctx.typeRef?.();
            if (typeRef) {
                const name = this.extractTypeRefName(typeRef);
                if (name) {
                    const kind = classifySymbol(name);
                    if (kind) {
                        this.deps.push({ type: kind, apiName: name, referenceType: 'ReturnType' });
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // formalParameter : modifier* typeRef id
        // -----------------------------------------------------------------------
        visitFormalParameter(ctx) {
            const typeRef = ctx.typeRef?.();
            if (typeRef) {
                const name = this.extractTypeRefName(typeRef);
                if (name) {
                    const kind = classifySymbol(name);
                    if (kind) {
                        this.deps.push({ type: kind, apiName: name, referenceType: 'Parameter' });
                    }
                    // Record parameter → type for field access resolution
                    // formalParameter ends with id (the parameter name)
                    const idNode = ctx.id?.();
                    if (idNode) {
                        this.varTypes.set(idNode.getText(), name);
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // newExpression : NEW creator
        // creator : createdName (noRest | classCreatorRest | arrayCreatorRest | ...)
        // createdName : idCreatedNamePair (DOT idCreatedNamePair)*
        // idCreatedNamePair : anyId (LT typeList GT)?
        // -----------------------------------------------------------------------
        visitNewExpression(ctx) {
            const creator = ctx.creator?.();
            if (creator) {
                const createdName = creator.createdName?.();
                if (createdName) {
                    const pairs = createdName.idCreatedNamePair?.();
                    const pairList = Array.isArray(pairs) ? pairs : pairs ? [pairs] : [];
                    if (pairList.length > 0) {
                        // First segment is the class/object name
                        const rawName = pairList[0].anyId?.()?.getText() ?? pairList[0].getText().split('<')[0];
                        if (rawName) {
                            const kind = classifySymbol(rawName);
                            if (kind) {
                                this.deps.push({ type: kind, apiName: rawName, referenceType: 'Instantiation' });
                            }
                        }
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // dotExpression : expression (DOT | QUESTIONDOT) (dotMethodCall | anyId)
        //
        // This handles BOTH:
        //   MyClass.someMethod()   → dotMethodCall child present
        //   myVar.MyField__c       → anyId child present (field/property access)
        //
        // ctx.children layout: [receiverExpr, DOT_token, (dotMethodCall | anyId)]
        // -----------------------------------------------------------------------
        visitDotExpression(ctx) {
            try {
                const children = ctx.children;
                if (!children || children.length < 3) {
                    return this.visitChildren(ctx);
                }
                const receiverCtx = children[0];
                const rightCtx = children[2]; // dotMethodCall or anyId token
                const receiverText = receiverCtx.getText();
                // Take the last segment of a dotted chain as the receiver name
                const receiverName = receiverText.split('.').pop() ?? receiverText;
                // Check if right side is a dotMethodCall (has children with LPAREN)
                const isDotMethodCall = ctx.dotMethodCall?.() != null;
                if (isDotMethodCall) {
                    // Static or instance method call: Receiver.method()
                    const kind = classifySymbol(receiverName);
                    if (kind === 'ApexClass') {
                        this.deps.push({
                            type: 'ApexClass',
                            apiName: receiverName,
                            referenceType: 'StaticMethodCall',
                        });
                    }
                }
                else {
                    // Field or property access: receiver.fieldName
                    const fieldName = rightCtx.getText?.() ?? '';
                    if (isCustomField(fieldName)) {
                        // Resolve variable to its declared type if possible
                        const resolvedType = this.varTypes.get(receiverText) ?? receiverName;
                        this.deps.push({
                            type: 'CustomField',
                            apiName: `${resolvedType}.${fieldName}`,
                            referenceType: 'FieldAccess',
                        });
                    }
                }
            }
            catch {
                // Non-fatal — continue
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // castExpression : LPAREN typeRef RPAREN expression
        // Captures cast targets — e.g. (Account) obj
        // -----------------------------------------------------------------------
        visitCastExpression(ctx) {
            const typeRef = ctx.typeRef?.();
            if (typeRef) {
                const name = this.extractTypeRefName(typeRef);
                if (name) {
                    const kind = classifySymbol(name);
                    if (kind) {
                        this.deps.push({ type: kind, apiName: name, referenceType: 'Cast' });
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // query : SELECT selectList FROM fromNameList ...
        //
        // fromNameList : fieldName soqlId? (COMMA fieldName soqlId?)*
        // fieldName    : soqlId (DOT soqlId)*
        // soqlId       : id
        //
        // selectList   : selectEntry (COMMA selectEntry)*
        // selectEntry  : fieldName soqlId? | soqlFunction | subQuery | typeOf
        // -----------------------------------------------------------------------
        visitQuery(ctx) {
            let firstFromObject = null;
            // --- FROM objects
            const fromNameList = ctx.fromNameList?.();
            if (fromNameList) {
                // fromNameList contains fieldName nodes (not fromName nodes)
                const fieldNames = fromNameList.fieldName?.();
                const fnList = Array.isArray(fieldNames) ? fieldNames : fieldNames ? [fieldNames] : [];
                for (const fieldName of fnList) {
                    // fieldName : soqlId (DOT soqlId)*
                    // For FROM clause, first soqlId is the object name
                    const soqlIds = fieldName.soqlId?.();
                    const idList = Array.isArray(soqlIds) ? soqlIds : soqlIds ? [soqlIds] : [];
                    if (idList.length === 0)
                        continue;
                    const nameText = idList[0].getText();
                    if (!firstFromObject)
                        firstFromObject = nameText;
                    const kind = classifySymbol(nameText);
                    if (kind === 'CustomObject' || kind === 'StandardObject') {
                        this.deps.push({ type: kind, apiName: nameText, referenceType: 'SoqlFrom' });
                    }
                }
            }
            // --- SELECT fields (custom fields only)
            const selectList = ctx.selectList?.();
            if (selectList && firstFromObject) {
                const entries = selectList.selectEntry?.();
                const entryList = Array.isArray(entries) ? entries : entries ? [entries] : [];
                for (const entry of entryList) {
                    // selectEntry : fieldName soqlId? | soqlFunction | subQuery | typeOf
                    const fieldName = entry.fieldName?.();
                    if (!fieldName)
                        continue;
                    // fieldName : soqlId (DOT soqlId)*
                    // Last soqlId is the leaf field name
                    const soqlIds = fieldName.soqlId?.();
                    const idList = Array.isArray(soqlIds) ? soqlIds : soqlIds ? [soqlIds] : [];
                    if (idList.length === 0)
                        continue;
                    const leafField = idList[idList.length - 1].getText();
                    if (isCustomField(leafField)) {
                        this.deps.push({
                            type: 'CustomField',
                            apiName: `${firstFromObject}.${leafField}`,
                            referenceType: 'SoqlSelect',
                        });
                    }
                }
            }
            return this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Helpers
        // -----------------------------------------------------------------------
        /**
         * Extracts the primary type name from a typeRef context.
         *
         * typeRef  : typeName (DOT typeName)* arraySubscripts
         * typeName : LIST | SET | MAP | id typeArguments?
         *
         * We want the first typeName's id text, e.g.:
         *   "Account"       → "Account"
         *   "List<Account>" → "List"   (collection types handled by declaration visitors)
         *   "Account[]"     → "Account"
         *   "MyClass"       → "MyClass"
         */
        extractTypeRefName(typeRef) {
            try {
                // typeRef.typeName() may return array (for dotted types like Outer.Inner)
                const typeNames = typeRef.typeName?.();
                const first = Array.isArray(typeNames) ? typeNames[0] : typeNames;
                if (!first)
                    return null;
                // typeName : LIST | SET | MAP | id typeArguments?
                // Try to get the id child first
                const idNode = first.id?.();
                if (idNode)
                    return idNode.getText() || null;
                // Fall back to getText() and strip generics/arrays
                const text = first.getText();
                return text.split('<')[0].split('[')[0] || null;
            }
            catch {
                return null;
            }
        }
    }
    return new DependencyVisitor();
}
// ---------------------------------------------------------------------------
// File finder
// ---------------------------------------------------------------------------
function findApexFile(componentName, sourceDir, extension) {
    const classFile = `${componentName}.${extension}`;
    const directPath = path.join(sourceDir, extension === 'cls' ? 'classes' : 'triggers', classFile);
    if (fs.existsSync(directPath))
        return directPath;
    return walkDir(sourceDir, (f) => path.basename(f) === classFile);
}
function walkDir(dir, predicate) {
    if (!fs.existsSync(dir))
        return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const result = walkDir(full, predicate);
            if (result)
                return result;
        }
        else if (predicate(full)) {
            return full;
        }
    }
    return null;
}
// ---------------------------------------------------------------------------
// Flow / ValidationRule XML analysis — regex-based, no AST needed
// ---------------------------------------------------------------------------
function analyzeFlowFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    let match;
    const objectRegex = /<object>([\w]+(?:__c)?)<\/object>/g;
    while ((match = objectRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'FlowObject' });
    }
    const fieldRegex = /<field>([\w]+__c)<\/field>/g;
    while ((match = fieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'FlowField' });
    }
    return deduplicateDeps(deps);
}
function analyzeValidationRuleFile(filePath) {
    const deps = [];
    if (!fs.existsSync(filePath))
        return deps;
    const source = fs.readFileSync(filePath, 'utf-8');
    let match;
    const formulaFieldRegex = /\b([\w]+__c)\b/g;
    while ((match = formulaFieldRegex.exec(source)) !== null) {
        deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'ValidationFormula' });
    }
    return deduplicateDeps(deps);
}
//# sourceMappingURL=textAnalyzer.js.map