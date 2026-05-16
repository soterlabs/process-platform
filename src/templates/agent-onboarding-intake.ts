import type { Template } from "@/entities/template";

const YES = "yes";
const NO = "no";

/** Completion rules without ternaries (expression VM does not validate ConditionalExpression). */
const COMPLETE = [
  "trim(intake.projectName).length > 0",
  "trim(intake.estimatedTotalBudget).length > 0",
  "trim(intake.brandAnnouncementTimeline).length > 0",
  "trim(intake.tgeStrategyOverview).length > 0",
  "trim(intake.allocationStrategyOverview).length > 0",
  'intake.caymanFoundationIncorporated === "yes" || intake.caymanFoundationIncorporated === "no"',
  '(intake.caymanFoundationIncorporated !== "yes" || intake.caymanFoundationCert != null) && (intake.caymanFoundationIncorporated !== "no" || trim(intake.caymanFoundationNotIncorporatedReason).length > 0)',
  'intake.foundationMultisigAgreementSigned === "yes" || intake.foundationMultisigAgreementSigned === "no"',
  '(intake.foundationMultisigAgreementSigned !== "yes" || intake.foundationMultisigSignedDoc != null) && (intake.foundationMultisigAgreementSigned !== "no" || trim(intake.foundationMultisigAnticipatedSignatureDate).length > 0)',
  "trim(intake.codename).length > 0",
  "trim(intake.realName).length > 0",
  "trim(intake.realNameRevealTimeline).length > 0",
  "trim(intake.agentShortDescription).length > 0",
  "trim(intake.primitivesActivated).length > 0",
  "intake.primitivesAcknowledgment === true",
  "trim(intake.brandName).length > 0",
  "trim(intake.socialMediaAccounts).length > 0",
  'intake.ipRegistrationSubmitted === "yes" || intake.ipRegistrationSubmitted === "no"',
  '(intake.ipRegistrationSubmitted !== "yes" || intake.ipRegistrationExecutedAgreement != null) && (intake.ipRegistrationSubmitted !== "no" || trim(intake.ipRegistrationAnticipatedDate).length > 0)',
  'intake.flcStatus === "yes" || intake.flcStatus === "no"',
  '(intake.flcStatus !== "yes" || trim(intake.flcTransactionHash).length > 0) && (intake.flcStatus !== "no" || trim(intake.flcEstimatedTransactionDate).length > 0)',
  "intake.allocationSpecifications && intake.allocationSpecifications[0] && trim(intake.allocationSpecifications[0].domain).length > 0 && trim(intake.allocationSpecifications[0].target).length > 0 && intake.allocationSpecifications[0].volumeUsdM != null",
  'intake.previousAudit === "yes" || intake.previousAudit === "no"',
  '(intake.previousAudit !== "yes" || trim(intake.auditReportsUrl).length > 0)',
  "trim(intake.allocationStrategyWritten).length > 0",
  "intake.multisigBestPracticesAck === true",
  "intake.emergencyResponseAck === true",
  "intake.signers && intake.signers[0] && trim(intake.signers[0].name).length > 0 && trim(intake.signers[0].walletAddress).length > 0",
  "trim(intake.freezerSignerContactName).length > 0",
  "trim(intake.freezerSignerWalletAddresses).length > 0",
  "trim(intake.freezerSignerVerificationDetails).length > 0",
  "intake.emergencyContacts && intake.emergencyContacts[0] && trim(intake.emergencyContacts[0].fullName).length > 0 && trim(intake.emergencyContacts[0].email).length > 0 && trim(intake.emergencyContacts[0].telegramSignal).length > 0",
  "trim(intake.agentOrganizationName).length > 0",
  "trim(intake.primaryContactFullName).length > 0",
  "trim(intake.primaryContactEmail).length > 0",
  "trim(intake.primaryContactTelegramSignal).length > 0",
  "intake.finalConfirmation === true",
].join(" && ");

export const agentOnboardingIntakeTemplate: Template = {
  key: "agent-onboarding-intake",
  name: "Agent Onboarding Intake Form",
  description:
    "Incoming Agent onboarding intake. Submitted for govops review; reviewer sign-offs are handled outside this form.",
  firstStepKey: "intake",
  permissions: [],
  steps: [
    {
      key: "intake",
      type: "input",
      title: "Agent Onboarding Intake",
      permissions: [],
      nextStepKey: "notify",
      completeExpression: COMPLETE,
      confirmationMessage:
        "Your onboarding intake has been saved. A notification will be sent to the Soter Labs team.",
      inputs: [
        {
          key: "_section_admin",
          type: "header",
          title: "Admin",
          defaultValue:
            "High-level onboarding information including TGE strategy, budget, and brand announcement timing.",
        },
        {
          key: "projectName",
          type: "string",
          title: "Current project name (internal working title)",
        },
        {
          key: "estimatedTotalBudget",
          type: "string",
          title: "Estimated total budget",
        },
        {
          key: "brandAnnouncementTimeline",
          type: "string",
          title: "Expected brand announcement timeline",
        },
        {
          key: "tgeStrategyOverview",
          type: "string-multiline",
          title: "Token Generation Event (TGE) strategy overview",
        },
        {
          key: "allocationStrategyOverview",
          type: "string-multiline",
          title: "Allocation strategy overview",
        },
        {
          key: "adminSupportingMaterials",
          type: "file-multiple",
          title: "Supporting materials (documents, charts, and additional references)",
        },

        {
          key: "_section_legal",
          type: "header",
          title: "Legal",
          defaultValue:
            "Entity setup confirmations and certificates of incorporation.",
        },
        {
          key: "_section_legal_cayman",
          type: "header",
          title: "Cayman Foundation (required)",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "caymanFoundationIncorporated",
          type: "dropdown",
          values: [YES, NO],
          title: "Has the Cayman Foundation legal entity been incorporated?",
        },
        {
          key: "caymanFoundationCert",
          type: "file-single",
          title: "Certificate of Incorporation documentation",
          visibleExpression: `intake.caymanFoundationIncorporated === "${YES}"`,
        },
        {
          key: "caymanFoundationNotIncorporatedReason",
          type: "string",
          title: "Brief explanation as to why the foundation has not yet been incorporated",
          visibleExpression: `intake.caymanFoundationIncorporated === "${NO}"`,
        },

        {
          key: "_section_legal_devco",
          type: "header",
          title: "DevCo (optional)",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "devcoIncorporated",
          type: "dropdown",
          values: [YES, NO],
          title: "Has the DevCo entity been incorporated?",
        },
        {
          key: "devcoCert",
          type: "file-single",
          title: "Certificate of incorporation",
          visibleExpression: `intake.devcoIncorporated === "${YES}"`,
        },
        {
          key: "devcoNotIncorporatedReason",
          type: "string",
          title: "Brief explanation as to why the DevCo has not yet been incorporated",
          visibleExpression: `intake.devcoIncorporated === "${NO}"`,
        },

        {
          key: "_section_legal_bvi",
          type: "header",
          title: "BVI Token Issuer (optional)",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "bviTokenIssuerIncorporated",
          type: "dropdown",
          values: [YES, NO],
          title:
            "Has the BVI token issuer entity been incorporated?",
        },
        {
          key: "bviLegalEntityName",
          type: "string",
          title: "BVI token issuer legal entity name",
          visibleExpression: `intake.bviTokenIssuerIncorporated === "${YES}"`,
        },
        {
          key: "bviTokenIssuerCert",
          type: "file-single",
          title: "Certificate of incorporation",
          visibleExpression: `intake.bviTokenIssuerIncorporated === "${YES}"`,
        },
        {
          key: "bviTokenIssuerNotIncorporatedReason",
          type: "string",
          title: "Brief explanation as to why the BVI token issuer has not yet been incorporated",
          visibleExpression: `intake.bviTokenIssuerIncorporated === "${NO}"`,
        },

        {
          key: "_section_legal_multisig",
          type: "header",
          title: "Foundation Multisig Service Agreement",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "foundationMultisigAgreementSigned",
          type: "dropdown",
          values: [YES, NO],
          title: "Has the Foundation Multisig Service Agreement been signed by all parties?",
        },
        {
          key: "foundationMultisigSignedDoc",
          type: "file-single",
          title: "Supporting document — signed agreement",
          visibleExpression: `intake.foundationMultisigAgreementSigned === "${YES}"`,
        },
        {
          key: "foundationMultisigAnticipatedSignatureDate",
          type: "string",
          title: "Additional details — anticipated signature date",
          visibleExpression: `intake.foundationMultisigAgreementSigned === "${NO}"`,
        },

        {
          key: "_section_atlas",
          type: "header",
          title: "Artifact & Governance (Atlas)",
          defaultValue: "Agent identity and primitives.",
        },
        {
          key: "codename",
          type: "string",
          title: "Codename",
        },
        {
          key: "realName",
          type: "string",
          title: "Real Name",
        },
        {
          key: "realNameRevealTimeline",
          type: "string",
          title: "Estimated time until reveal of Real Name",
        },
        {
          key: "agentShortDescription",
          type: "string-multiline",
          title:
            "Short description of the Agent (brief overview of vision or business model)",
        },
        {
          key: "primitivesActivated",
          type: "string-multiline",
          title:
            "List of primitives being activated (e.g. Integration Boost, Distribution Rewards). Refer to Atlas for definitions and requirements.",
        },
        {
          key: "primitivesAcknowledgment",
          type: "bool",
          title:
            "I acknowledge the requirements of A.2.2.1.2–A.2.2.1.4, including that Sky Primitives must be Globally Activated prior to Invocation, that Activation does not itself constitute Invocation, and that changes to Global Activation Status are governed by Artifact lifecycle stage and applicable governance procedures.",
        },
        {
          key: "atlasSupportingMaterials",
          type: "file-multiple",
          title: "Upload any supporting materials",
        },

        {
          key: "_section_branding",
          type: "header",
          title: "Branding & IP",
          defaultValue: undefined,
        },
        {
          key: "brandName",
          type: "string",
          title: "Brand name",
        },
        {
          key: "logoBrandAssets",
          type: "file-multiple",
          title: "Logo and brand assets",
        },
        {
          key: "socialHandles",
          type: "string-multiline",
          title: "Social handles (e.g. X, Discord) — text or links accepted",
        },
        {
          key: "socialMediaAccounts",
          type: "string-multiline",
          title: "Social media accounts — text or links accepted",
        },
        {
          key: "ipRegistrationSubmitted",
          type: "dropdown",
          values: [YES, NO],
          title:
            "Has IP registration been submitted by Moonbow and licensed back to the Agent Foundation?",
        },
        {
          key: "ipRegistrationExecutedAgreement",
          type: "file-single",
          title: "Supporting document — executed agreement",
          visibleExpression: `intake.ipRegistrationSubmitted === "${YES}"`,
        },
        {
          key: "ipRegistrationAnticipatedDate",
          type: "string",
          title: "Supporting information (anticipated submission date)",
          visibleExpression: `intake.ipRegistrationSubmitted === "${NO}"`,
        },

        {
          key: "_section_alloc_tech",
          type: "header",
          title: "Allocation System (Tech)",
          defaultValue: undefined,
        },
        {
          key: "flcStatus",
          type: "dropdown",
          values: [YES, NO],
          title:
            "First Loss Capital (FLC) status — confirmation of deposit or expected timeline (FLC amount, source of funds, and anticipated timing)",
        },
        {
          key: "flcTransactionHash",
          type: "string",
          title: "Transaction hash",
          visibleExpression: `intake.flcStatus === "${YES}"`,
        },
        {
          key: "flcEstimatedTransactionDate",
          type: "string",
          title: "Estimated date of the transaction (if deposit not yet available)",
          visibleExpression: `intake.flcStatus === "${NO}"`,
        },
        {
          key: "allocationSpecifications",
          type: "item_list",
          title:
            "Allocation specifications — for each target: domain (e.g. Ethereum Mainnet), specific target (e.g. Syrup USDC on Maple), and volume (e.g. $100M)",
          subInputs: [
            {
              key: "domain",
              type: "string",
              title: "Domain",
            },
            {
              key: "target",
              type: "string",
              title: "Target",
            },
            {
              key: "volumeUsdM",
              type: "number",
              title: "Volume ($M)",
            },
          ],
        },
        {
          key: "githubOrganizationLink",
          type: "string",
          title: "GitHub organization link",
        },
        {
          key: "otherTechnicalConsiderations",
          type: "string-multiline",
          title: "Other technical considerations",
        },
        {
          key: "otherTechnicalSupportingDocs",
          type: "file-multiple",
          title: "Other technical — supporting documents",
        },

        {
          key: "_section_alloc_risk",
          type: "header",
          title: "Allocation System (Risk)",
          defaultValue: undefined,
        },
        {
          key: "allocationStrategyWritten",
          type: "string-multiline",
          title: "Allocation strategy (written)",
        },
        {
          key: "allocationStrategyDocs",
          type: "file-multiple",
          title: "Allocation strategy — supporting documents",
        },
        {
          key: "riskParameterMapping",
          type: "string-multiline",
          title: "Standardized risk parameter mapping",
        },
        {
          key: "riskParameterMappingDocs",
          type: "file-multiple",
          title: "Risk parameter mapping — supporting documents",
        },
        {
          key: "initialRiskCapitalEvidence",
          type: "string-multiline",
          title: "Initial required risk capital — evidence of compliance",
        },
        {
          key: "riskCapitalDocs",
          type: "file-multiple",
          title: "Risk capital — supporting documents",
        },
        {
          key: "previousAudit",
          type: "dropdown",
          values: [YES, NO],
          title: "Have you had a previous audit?",
        },
        {
          key: "auditReportsUrl",
          type: "string",
          title: "Audit reports — URL",
          visibleExpression: `intake.previousAudit === "${YES}"`,
        },

        {
          key: "_section_alloc_ops",
          type: "header",
          title: "Allocation System (Ops)",
          defaultValue: undefined,
        },
        {
          key: "_section_ops_ack",
          type: "header",
          title: "Acknowledgments",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "multisigBestPracticesAck",
          type: "bool",
          title:
            "I have reviewed and acknowledged the Sky Multisig Best Practices document.",
        },
        {
          key: "emergencyResponseAck",
          type: "bool",
          title:
            "I have reviewed and acknowledged the Atlas Emergency Response Article.",
        },
        {
          key: "_section_ops_signers",
          type: "header",
          title: "Signers and Wallets",
          headerLevel: "subsection",
          defaultValue:
            "Add one row per signer. Use the extra row at the bottom to add more signers.",
        },
        {
          key: "signers",
          type: "item_list",
          title: "Signers",
          subInputs: [
            {
              key: "name",
              type: "string",
              title: "Name",
            },
            {
              key: "walletAddress",
              type: "string",
              title: "Wallet address (EVM: 0x + 40 hex characters)",
            },
          ],
        },
        {
          key: "signerSupportingDocs",
          type: "file-multiple",
          title: "Supporting documents (multisig setup, signer authorizations)",
        },
        {
          key: "_section_ops_details",
          type: "header",
          title: "Operational Details",
          headerLevel: "subsection",
          defaultValue: undefined,
        },
        {
          key: "allocationExecutionEvidence",
          type: "string-multiline",
          title:
            "Allocation execution — evidence the Agent is running allocations as per Artifact instructions",
        },
        {
          key: "allocationExecutionDocs",
          type: "file-multiple",
          title: "Allocation execution — supporting documents",
        },
        {
          key: "freezerSignerContactName",
          type: "string",
          title: "Contact name for the freezer signer wallet",
        },
        {
          key: "freezerSignerWalletAddresses",
          type: "string-multiline",
          title: "Freezer signer wallet addresses (EVM: 0x + 40 hex characters each)",
        },
        {
          key: "freezerSignerVerificationDetails",
          type: "string",
          title: "Verification details",
        },
        {
          key: "_section_ops_emergency",
          type: "header",
          title: "Emergency Response",
          headerLevel: "subsection",
          defaultValue: "Add one row per emergency contact.",
        },
        {
          key: "emergencyContacts",
          type: "item_list",
          title: "Emergency contacts",
          subInputs: [
            {
              key: "fullName",
              type: "string",
              title: "Full name",
            },
            {
              key: "email",
              type: "string",
              title: "Email",
            },
            {
              key: "phone",
              type: "string",
              title: "Phone number (optional)",
            },
            {
              key: "telegramSignal",
              type: "string",
              title: "Telegram / Signal handle",
            },
          ],
        },

        {
          key: "_section_signoff",
          type: "header",
          title: "Sign-off",
          defaultValue: undefined,
        },
        {
          key: "agentOrganizationName",
          type: "string",
          title: "Agent name (organization or entity submitting)",
        },
        {
          key: "primaryContactFullName",
          type: "string",
          title: "Primary contact — Full name",
        },
        {
          key: "primaryContactEmail",
          type: "string",
          title: "Primary contact — Email",
        },
        {
          key: "primaryContactTelegramSignal",
          type: "string",
          title: "Primary contact — Telegram/Signal",
        },
        {
          key: "finalConfirmation",
          type: "bool",
          title:
            "I confirm all information provided in this form is accurate and complete to the best of my knowledge.",
        },
      ],
    },
    {
      key: "notify",
      type: "slack_notify",
      title: "Notify team",
      channelId: "soterlabs-agent-onboarding",
      mentionUsers: [
        "filip@soterlabs.com",
        "jamilya@soterlabs.com",
        "retro@soterlabs.com",
        "wolf@soterlabs.com",
        "banxy@soterlabs.com",
      ],
      messageExpression:
        '"Agent onboarding intake form completed.\\n" + ' +
        '"• Agent: " + (intake.agentOrganizationName ?? "") + "\\n" + ' +
        '"• Primary contact: " + (intake.primaryContactFullName ?? "") + "\\n" + ' +
        '"• Final confirmation: " + (intake.finalConfirmation === true ? "Yes" : "No") + "\\n\\n" + ' +
        '"<" + currentProcess.url + "|View submission>"',
      nextStepKey: null,
      confirmationMessage: "Slack notification sent to #soterlabs-agent-onboarding.",
    },
  ],
  resultViewControls: [
    { data: "${intake.agentOrganizationName}", title: "Agent" },
    { data: "${intake.primaryContactFullName}", title: "Primary contact" },
    { data: "${intake.primaryContactEmail}", title: "Contact email" },
    { data: "${intake.codename}", title: "Codename" },
    { data: "${intake.brandName}", title: "Brand name" },
    { data: "${intake.projectName}", title: "Project name" },
  ],
};
