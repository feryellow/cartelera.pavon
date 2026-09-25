import { getDeployStore, getStore } from "@netlify/blobs";

export function controlStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-control", { consistency: "strong" })
    : getDeployStore("pavon-control");
}

export function carteleriaStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-carteleria", { consistency: "strong" })
    : getDeployStore("pavon-carteleria");
}

export function assetStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-assets", { consistency: "strong" })
    : getDeployStore("pavon-assets");
}

export function notificationStore() {
  return Netlify.context?.deploy?.context === "production"
    ? getStore("pavon-notifications", { consistency: "strong" })
    : getDeployStore("pavon-notifications");
}
