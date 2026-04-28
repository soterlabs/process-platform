import type { Template } from "@/entities/template";

export const nfatSetupFacilityTemplate: Template = {
  key: "nfat-setup-facility",
  name: "NFAT Setup Facility",
  firstStepKey: "setup",
  permissions: [],
  steps: [
    {
      key: "setup",
      type: "input",
      title: "Deploy NFAT Facility",
      permissions: ["nfat:operate"],
      nextStepKey: null,
      inputs: [
        {
          key: "deployName",
          type: "string",
          title: "Facility Name",
        },
        {
          key: "deploySymbol",
          type: "string",
          title: "Facility symbol",
        },
        {
          key: "deployNFATTxPayload",
          type: "string-multiline",
          readOnly: true,
          title: "deployNFAT(address,string,string) transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("deployNFAT(address,string,string)"), "0xdc035d45d973e3ec169d2276ddab16f1e407384f", setup.deployName, setup.deploySymbol) }}',
        },
        {
          key: "deployNFATTxHash",
          type: "string",
          title: "Deploy transaction hash (after submitting deployNFAT using the payload above)",
        },
        {
          key: "nfatFacilityAddress",
          type: "string",
          title: "NFAT Facility Address",
        },
        {
          key: "nfatAlmController",
          type: "string",
          title: "NFAT ALM Controller Address",
        },
        {
          key: "nfatAlmRateLimits",
          type: "string",
          title: "NFAT Rate Limits Address",
        },
        {
          key: "setControllerTxPayload",
          type: "string-multiline",
          readOnly: true,
          title: "setCBeamForController transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("setCBeamForController(address,address)"), setup.nfatAlmController, setup.nfatFacilityAddress) }}',
        },
        {
          key: "setControllerTxHash",
          type: "string",
          title:
            "Transaction hash (after submitting the setCBeamForController call using the payload above)",
        },
        {
          key: "setRateLimitsTxPayload",
          type: "string-multiline",
          readOnly: true,
          title: "setCBeamForRateLimits transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("setCBeamForRateLimits(address,address)"), setup.nfatAlmRateLimits, setup.nfatFacilityAddress) }}',
        },
        {
          key: "setRateLimitsTxHash",
          type: "string",
          title:
            "Transaction hash (after submitting the setCBeamForRateLimits call using the payload above)",
        },
        // {
        //   key: "verifyBeamStateActions",
        //   type: "bool",
        //   readOnly: true,
        //   title: "Verify: Controller actions whitelisted on BeamState (optional)",
        // },
        {
          key: "verifyWards",
          type: "bool",
          title: "Verify: Wards role granted to SubProxy, Core Council",
        },
        {
          key: "verifyBuds",
          type: "bool",
          title: "Verify: Buds role granted to GovOps",
        },
        {
          key: "verifyCops",
          type: "bool",
          title: "Verify: Cops role granted to [TODO]",
        },
        {
          key: "haloRepayRateLimit",
          type: "bool",
          title: "Verify: Repay Rate Limit is set",
        },
      ],
      confirmationMessage: "Thank you. The NFAT Facility is now setup.",
    },
  ],
  resultViewControls: [
    { data: "${setup.deployNFATTxHash}", title: "deployNFAT transaction hash" },
    { data: "${setup.setControllerTxHash}", title: "BeamState Controller-cBEAM transaction hash" },
    { data: "${setup.setRateLimitsTxHash}", title: "BeamState RateLimits-cBEAM transaction hash" },
  ],
};
