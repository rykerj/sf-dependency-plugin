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
// ---------------------------------------------------------------------------
// Standard Salesforce objects — treated as object dependencies, not ApexClass
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
// System types — never emitted as class or object references
// Checked case-insensitively (Apex is case-insensitive)
// ---------------------------------------------------------------------------
const SYSTEM_TYPES_LOWER = new Set([
    // Primitives
    'string', 'integer', 'long', 'double', 'decimal', 'boolean',
    'date', 'datetime', 'time', 'blob', 'id', 'object', 'void',
    // Collections
    'list', 'set', 'map', 'iterable', 'iterator',
    // Core namespaces
    'system', 'database', 'schema', 'limits', 'math', 'json',
    'userinfo', 'apexpages', 'messaging', 'connectapi', 'eventbus',
    'crypto', 'encodingutil', 'url', 'label', 'type',
    // HTTP
    'http', 'httprequest', 'httpresponse',
    'restcontext', 'restrequest', 'restresponse',
    // Testing
    'test', 'assert',
    // SObject and exceptions
    'sobject', 'exception', 'apexexception', 'dmlexception',
    'queryexception', 'listexception', 'calloutexception',
    'noclassexception', 'nosuchmethodexception',
    // XML
    'xmlstreamreader', 'xmlstreamwriter',
    // Trigger / flow
    'flow', 'process', 'trigger', 'triggeroperation',
    // Reserved
    'null', 'true', 'false', 'this', 'super',
    // DML statement keywords (appear as identifiers in some contexts)
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
    return (lower.endsWith('__c') ||
        lower.endsWith('__r') ||
        lower.endsWith('__pc') ||
        lower.endsWith('__mdt') ||
        lower.endsWith('__e') ||
        lower.endsWith('__b') ||
        lower.endsWith('__x') ||
        lower.endsWith('__kav') ||
        lower.endsWith('__ka') ||
        lower.endsWith('__share') ||
        lower.endsWith('__history') ||
        lower.endsWith('__feed'));
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
//
// Parses an Apex .cls or .trigger file using @apexdevtools/apex-parser and
// walks the AST with a visitor to extract all dependency-relevant constructs.
//
// Requires: npm install @apexdevtools/apex-parser antlr4
// ---------------------------------------------------------------------------
function analyzeApexFile(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const source = fs.readFileSync(filePath, 'utf-8');
    try {
        // Dynamic require so the tool fails with a clear message if not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const apexParser = require('@apexdevtools/apex-parser');
        const { ApexParserFactory, ApexParserBaseVisitor } = apexParser;
        const isTrigger = filePath.endsWith('.trigger');
        const parser = ApexParserFactory.createParser(source);
        const tree = isTrigger ? parser.triggerUnit() : parser.compilationUnit();
        const visitor = buildVisitor(ApexParserBaseVisitor);
        visitor.visit(tree);
        return deduplicateDeps(visitor.deps);
    }
    catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new Error(`@apexdevtools/apex-parser is not installed.\n` +
                `Run: npm install @apexdevtools/apex-parser antlr4\n` +
                `Original error: ${err.message}`);
        }
        // Parse errors in individual files — warn and continue rather than
        // aborting the whole resolution run
        console.warn(`[textAnalyzer] Parse error in ${filePath}: ${err.message}`);
        return [];
    }
}
// ---------------------------------------------------------------------------
// Visitor factory
//
// We use a factory function rather than a top-level class because
// ApexParserBaseVisitor is only available after the dynamic require.
// The factory creates a class that extends it at runtime.
//
// Context types below are annotated as `any` until the package is installed.
// After `npm install @apexdevtools/apex-parser`, replace `any` with the
// generated context types from:
//   node_modules/@apexdevtools/apex-parser/out/ApexParser.d.ts
//
// ANTLR4 naming conventions used here:
//   Grammar rule (camelCase) → visit method (visitPascalCase)
//   e.g.  classDeclaration       → visitClassDeclaration
//         localVariableDeclaration → visitLocalVariableDeclaration
//         soqlLiteral            → visitSoqlLiteral
//
//   Child rule access:     ctx.ruleName()        → single child
//                          ctx.ruleName()        → array when rule repeats
//   Token text access:     ctx.TOKEN().getText()
//   Full subtree text:     ctx.getText()
// ---------------------------------------------------------------------------
function buildVisitor(ApexParserBaseVisitor) {
    class DependencyVisitor extends ApexParserBaseVisitor {
        constructor() {
            super(...arguments);
            // Collected dependency list — read by analyzeApexFile after visit
            this.deps = [];
            // Variable name → declared type map for field access resolution
            // e.g.  Account acc  →  'acc' → 'Account'
            this.varTypes = new Map();
        }
        // -----------------------------------------------------------------------
        // Class declaration
        //
        // Grammar (BaseApexParser.g4):
        //   classDeclaration
        //     : CLASS id
        //       (EXTENDS typeRef)?
        //       (IMPLEMENTS typeList)?
        //       classBody ;
        //
        // ctx.typeRef()  → the extends type (one, if present)
        // ctx.typeList() → the implements list (if present)
        // -----------------------------------------------------------------------
        visitClassDeclaration(ctx) {
            // extends
            const extendsTypeRef = this.childRule(ctx, 'typeRef');
            if (extendsTypeRef) {
                const name = this.typeRefName(extendsTypeRef);
                if (name && classifySymbol(name) === 'ApexClass') {
                    this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Extends' });
                }
            }
            // implements — typeList holds comma-separated typeRefs
            const typeList = this.childRule(ctx, 'typeList');
            if (typeList) {
                for (const typeRef of this.childRules(typeList, 'typeRef')) {
                    const name = this.typeRefName(typeRef);
                    if (name && classifySymbol(name) === 'ApexClass') {
                        this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Implements' });
                    }
                }
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Variable / field declarations
        //
        // Grammar:
        //   localVariableDeclaration : modifier* typeRef variableDeclarators ;
        //   fieldDeclaration         : modifier* typeRef variableDeclarators SEMI ;
        //   variableDeclarators      : variableDeclarator (COMMA variableDeclarator)* ;
        //   variableDeclarator       : id (ASSIGN expression)? ;
        // -----------------------------------------------------------------------
        visitLocalVariableDeclaration(ctx) {
            this.handleTypedDeclaration(ctx);
            this.visitChildren(ctx);
        }
        visitFieldDeclaration(ctx) {
            this.handleTypedDeclaration(ctx);
            this.visitChildren(ctx);
        }
        handleTypedDeclaration(ctx) {
            const typeRef = this.childRule(ctx, 'typeRef');
            if (!typeRef)
                return;
            const typeName = this.typeRefName(typeRef);
            if (!typeName)
                return;
            const kind = classifySymbol(typeName);
            if (kind === 'ApexClass') {
                this.deps.push({ type: 'ApexClass', apiName: typeName, referenceType: 'TypeDeclaration' });
            }
            else if (kind === 'CustomObject') {
                this.deps.push({ type: 'CustomObject', apiName: typeName, referenceType: 'TypeDeclaration' });
            }
            else if (kind === 'StandardObject') {
                this.deps.push({ type: 'StandardObject', apiName: typeName, referenceType: 'TypeDeclaration' });
            }
            // Record variable → type for downstream field access resolution
            for (const decl of this.childRules(ctx, 'variableDeclarator')) {
                const idNode = this.childRule(decl, 'id');
                if (idNode) {
                    this.varTypes.set(idNode.getText(), typeName);
                }
            }
        }
        // -----------------------------------------------------------------------
        // Method declarations — return type
        //
        // Grammar:
        //   methodDeclaration
        //     : (VOID | typeRef) id formalParameters
        //       (THROWS qualifiedName)?
        //       (methodBody | SEMI) ;
        // -----------------------------------------------------------------------
        visitMethodDeclaration(ctx) {
            const typeRef = this.childRule(ctx, 'typeRef');
            if (typeRef) {
                const name = this.typeRefName(typeRef);
                if (name) {
                    const kind = classifySymbol(name);
                    if (kind === 'ApexClass') {
                        this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'ReturnType' });
                    }
                    else if (kind === 'CustomObject' || kind === 'StandardObject') {
                        this.deps.push({ type: kind, apiName: name, referenceType: 'ReturnType' });
                    }
                }
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Formal parameters
        //
        // Grammar:
        //   formalParameter : modifier* typeRef variableDeclaratorId ;
        // -----------------------------------------------------------------------
        visitFormalParameter(ctx) {
            const typeRef = this.childRule(ctx, 'typeRef');
            if (typeRef) {
                const name = this.typeRefName(typeRef);
                if (name) {
                    const kind = classifySymbol(name);
                    if (kind === 'ApexClass') {
                        this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Parameter' });
                    }
                    else if (kind === 'CustomObject' || kind === 'StandardObject') {
                        this.deps.push({ type: kind, apiName: name, referenceType: 'Parameter' });
                    }
                    // Record parameter → type mapping
                    const paramId = this.childRule(ctx, 'variableDeclaratorId') ||
                        this.childRule(ctx, 'id');
                    if (paramId) {
                        this.varTypes.set(paramId.getText(), name);
                    }
                }
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Object instantiation: new MyClass() / new Account() / new MyObj__c()
        //
        // Grammar:
        //   creator      : createdName (classCreatorRest | arrayCreatorRest | mapCreatorRest) ;
        //   createdName  : idCreatedNamePair (DOT idCreatedNamePair)* | primitiveType ;
        //   idCreatedNamePair : anyId (LT typeList GT)? ;
        // -----------------------------------------------------------------------
        visitCreator(ctx) {
            const createdName = this.childRule(ctx, 'createdName');
            if (createdName) {
                const pairs = this.childRules(createdName, 'idCreatedNamePair');
                if (pairs.length > 0) {
                    // First segment is the class/object name; subsequent are inner class paths
                    const rawName = pairs[0].getText().split('<')[0]; // strip generics
                    const kind = classifySymbol(rawName);
                    if (kind) {
                        this.deps.push({ type: kind, apiName: rawName, referenceType: 'Instantiation' });
                    }
                }
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Method calls on a receiver: MyClass.method() / instance.method()
        //
        // Grammar (simplified):
        //   expression
        //     : expression DOT methodCall      ← static / instance method call
        //     | expression DOT anyId           ← field/property access
        //     | primary                        ← standalone
        //     ...
        //
        // We intercept at the expression level via visitChildren propagation.
        // The dotMethodCall rule gives us the method name; we look at the
        // parent expression's first child for the receiver.
        // -----------------------------------------------------------------------
        visitDotMethodCall(ctx) {
            // ctx.parentCtx is the expression that contains: receiver DOT methodCall
            // ctx.parentCtx.children[0] is the receiver expression
            try {
                const parentChildren = ctx.parentCtx?.children;
                if (parentChildren && parentChildren.length >= 3) {
                    const receiverCtx = parentChildren[0];
                    const rawReceiver = receiverCtx.getText();
                    // Take the last segment of a dotted chain (e.g. "MyClass" from "this.MyClass")
                    const receiverName = rawReceiver.split('.').pop() ?? rawReceiver;
                    const kind = classifySymbol(receiverName);
                    if (kind === 'ApexClass') {
                        this.deps.push({
                            type: 'ApexClass',
                            apiName: receiverName,
                            referenceType: 'StaticMethodCall',
                        });
                    }
                }
            }
            catch {
                // Non-fatal — continue
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // SOQL — the grammar automatically parses inline SOQL
        //
        // Grammar:
        //   soqlLiteral : LBRACKET query RBRACKET ;
        //   query       : SELECT selectList FROM fromNameList
        //                 (USING SCOPE filterScope)?
        //                 (WHERE whereFields)?
        //                 ... ;
        //   fromNameList : fromName (COMMA fromName)* ;
        //   fromName     : fromId (AS? id)? ;
        //   fromId       : id (DOT id)? ;
        //   selectList   : selectEntry (COMMA selectEntry)* ;
        //   selectEntry  : soqlField | subQuery | typeOf ;
        //   soqlField    : soqlFieldName (DOT soqlFieldName)* ;
        //   soqlFieldName : anyId | COUNT ;
        // -----------------------------------------------------------------------
        visitQuery(ctx) {
            // --- FROM objects
            const fromNameList = this.childRule(ctx, 'fromNameList');
            let firstFromObject = null;
            if (fromNameList) {
                for (const fromName of this.childRules(fromNameList, 'fromName')) {
                    const fromId = this.childRule(fromName, 'fromId') || this.childRule(fromName, 'id');
                    if (!fromId)
                        continue;
                    // fromId may be dotted (e.g. schema.Account) — take last segment
                    const nameText = fromId.getText().split('.').pop() ?? fromId.getText();
                    if (!firstFromObject)
                        firstFromObject = nameText;
                    const kind = classifySymbol(nameText);
                    if (kind === 'CustomObject' || kind === 'StandardObject') {
                        this.deps.push({ type: kind, apiName: nameText, referenceType: 'SoqlFrom' });
                    }
                }
            }
            // --- SELECT fields (custom fields only)
            const selectList = this.childRule(ctx, 'selectList');
            if (selectList && firstFromObject) {
                for (const entry of this.childRules(selectList, 'selectEntry')) {
                    const soqlField = this.childRule(entry, 'soqlField');
                    if (!soqlField)
                        continue;
                    const fieldText = soqlField.getText();
                    // fieldText may be dotted: Relation__r.FieldName__c
                    const leafField = fieldText.split('.').pop() ?? fieldText;
                    if (isCustomField(leafField)) {
                        this.deps.push({
                            type: 'CustomField',
                            apiName: `${firstFromObject}.${leafField}`,
                            referenceType: 'SoqlSelect',
                        });
                    }
                }
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Field and property access: receiver.MyField__c
        //
        // In the grammar, dot field access appears as:
        //   expression DOT anyId
        // We capture all custom field accesses and resolve the object via varTypes.
        // -----------------------------------------------------------------------
        visitFieldAccess(ctx) {
            try {
                // ctx is the expression; getText() gives the full dotted text
                const text = ctx.getText();
                const lastDot = text.lastIndexOf('.');
                if (lastDot <= 0) {
                    this.visitChildren(ctx);
                    return;
                }
                const receiver = text.substring(0, lastDot);
                const fieldName = text.substring(lastDot + 1);
                if (isCustomField(fieldName)) {
                    // Resolve variable to its declared type if possible
                    const resolvedType = this.varTypes.get(receiver) ?? receiver;
                    this.deps.push({
                        type: 'CustomField',
                        apiName: `${resolvedType}.${fieldName}`,
                        referenceType: 'FieldAccess',
                    });
                }
            }
            catch {
                // Non-fatal
            }
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Generic type parameters in collection literals
        // Catches: List<Account>, Set<MyObj__c>, Map<Id, Account>
        //
        // These are captured indirectly via visitLocalVariableDeclaration /
        // visitFieldDeclaration / visitFormalParameter → handleTypedDeclaration
        // because typeRef encompasses the full generic type.
        // We additionally override visitTypeRef to catch any remaining uses
        // (e.g. cast expressions, instanceof).
        // -----------------------------------------------------------------------
        visitTypeRef(ctx) {
            // typeRef : typeName (LBRACKET RBRACKET)* ;
            // We handle this by extracting the base name and any generic type params
            // The base name is already captured by the declaration visitors above.
            // Here we just recurse to catch nested typeRefs (e.g. Map<Id, MyClass>)
            this.visitChildren(ctx);
        }
        // -----------------------------------------------------------------------
        // Private helpers
        // -----------------------------------------------------------------------
        /**
         * Gets a single named child rule from a context.
         * ANTLR4 generated contexts expose child rules as methods: ctx.ruleName()
         */
        childRule(ctx, ruleName) {
            try {
                const result = ctx[ruleName]?.();
                return result ?? null;
            }
            catch {
                return null;
            }
        }
        /**
         * Gets all instances of a named child rule.
         * When a grammar rule repeats, ANTLR4 returns an array from ctx.ruleName()
         */
        childRules(ctx, ruleName) {
            try {
                const result = ctx[ruleName]?.();
                if (Array.isArray(result))
                    return result;
                if (result)
                    return [result];
                return [];
            }
            catch {
                return [];
            }
        }
        /**
         * Extracts the primary type name from a typeRef context.
         *
         * typeRef  : typeName (LBRACKET RBRACKET)* ;
         * typeName : LIST | SET | MAP | ... | id (DOT id)* ;
         *
         * Examples:
         *   "Account"          → "Account"
         *   "List<Account>"    → "List"   (handled by collection visitors)
         *   "Account[]"        → "Account"
         *   "MyClass.Inner"    → "MyClass"
         */
        typeRefName(typeRef) {
            try {
                const text = typeRef.getText();
                // Strip array notation and generic parameters, take first segment of dotted name
                return text.split('[')[0].split('<')[0].split('.')[0] || null;
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
// Flow / ValidationRule XML analysis
// These remain regex-based — XML is not Apex and needs no AST parser
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