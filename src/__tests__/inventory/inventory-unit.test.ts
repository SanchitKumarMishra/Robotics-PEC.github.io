import { runCatalogValidationTests } from "./catalog-validation.test";
import { runLiabilityConsentTests } from "./liability-consent.test";
import { runInventoryStateTests } from "./inventory-state.test";
import { runInventoryRbacTests } from "./inventory-rbac.test";

export function runInventoryUnitTests() {
    console.log("--- Starting Inventory Unit Tests ---");
    runCatalogValidationTests();
    runLiabilityConsentTests();
    runInventoryStateTests();
    runInventoryRbacTests();
    console.log("--- All Inventory Unit Tests Passed Successfully ---");
}

if (typeof require !== "undefined" && require.main === module) {
    runInventoryUnitTests();
}
