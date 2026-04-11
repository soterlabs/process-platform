import type { Template } from "@/entities/template";

export const nfatEnableFacilityForPrimeTemplate: Template = {
  key: "nfat-enable-facility-for-prime",
  name: "NFAT Enable Facility for Prime",
  firstStepKey: "setup",
  allowedRoles: [],
  steps: [
    {
      key: "setup",
      type: "input",
      title: "Enable Facility for Prime",
      allowedRoles: [],
      nextStepKey: null,
      inputs: [
        {
          key: "nfatFacilityAddress",
          type: "string",
          title: "NFAT Facility Address",
        },
        {
          key: "primeProxyAddress",
          type: "string",
          title: "Prime ALM Proxy Address",
        },
        {
          key: "rateLimitsAddress",
          type: "string",
          title: "Rate limits contract address (rateLimits)",
        },
        {
          key: "subscriptionMaxAmount",
          type: "string",
          title: "Subscription: maxAmount (wei, full integer string)",
        },
        {
          key: "subscriptionSlope",
          type: "string",
          title: "Subscription: slope (wei, full integer string)",
        },
        {
          key: "subscriptionSetRateLimitTxPayload",
          type: "string-multiline",
          readOnly: true,
          title: "Subscription: setRateLimit transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("setRateLimit(address,bytes32,uint256,uint256)"), setup.rateLimitsAddress, makeAddressKey(LIMIT_SUBSCRIBE, setup.nfatFacilityAddress), setup.subscriptionMaxAmount, setup.subscriptionSlope) }}',
        },
        {
          key: "subscriptionSetRateLimitTxHash",
          type: "string",
          title:
            "Subscription: transaction hash (after submitting setRateLimit using the payload above)",
        },
        {
          key: "collectionMaxAmount",
          type: "string",
          title: "Collection: maxAmount (wei, full integer string)",
        },
        {
          key: "collectionSlope",
          type: "string",
          title: "Collection: slope (wei, full integer string)",
        },
        {
          key: "collectionSetRateLimitTxPayload",
          type: "string-multiline",
          readOnly: true,
          title: "Collection: setRateLimit transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("setRateLimit(address,bytes32,uint256,uint256)"), setup.rateLimitsAddress, makeAddressKey(LIMIT_COLLECT, setup.nfatFacilityAddress), setup.collectionMaxAmount, setup.collectionSlope) }}',
        },
        {
          key: "collectionSetRateLimitTxHash",
          type: "string",
          title:
            "Collection: transaction hash (after submitting setRateLimit using the payload above)",
        },
      ],
      confirmationMessage: "Thank you. The NFAT Facility is now enabled for Prime.",
    },
  ],
  resultViewControls: [
    { data: "${setup.subscriptionSetRateLimitTxHash}", title: "Subscription setRateLimit transaction hash" },
    { data: "${setup.collectionSetRateLimitTxHash}", title: "Collection setRateLimit transaction hash" },
  ],
};
