import type { Template } from "@/entities/template";

export const nfatSubscribeTemplate: Template = {
  key: "nfat-subscribe",
  name: "NFAT Subscribe to Facility",
  firstStepKey: "subscription_tx",
  permissions: [],
  steps: [
    {
      key: "subscription_tx",
      type: "input",
      title: "Enable Facility for Prime",
      permissions: ["nfat:operate"],
      nextStepKey: null,
      inputs: [
        {
          key: "nfatFacilityAddress",
          type: "string",
          title: "NFAT Facility Address",
        },
        {
          key: "primeAlmControllerAddress",
          type: "string",
          title: "Prime ALM Controller Address",
        },
        {
          key: "amount",
          type: "number",
          title:
            "Subscription amount (wei, full integer — e.g. 1000000000000000000 for 1 token with 18 decimals)",
        },
        {
          key: "txPayload",
          type: "string-multiline",
          readOnly: true,
          title: "Subscription Transaction payload",
          defaultValue:
            '{{ generatePayload(keccak256("subscribe(address,uint256,bytes)"), subscription_tx.nfatFacilityAddress, subscription_tx.amount, "0x") }}',
        },
        {
          key: "txHash",
          type: "string",
          title: "Subscription Transaction Hash",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${subscription_tx.txHash}", title: "Subscription Transaction Hash" }
  ],
};
