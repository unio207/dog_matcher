import { describe, expect, it } from "vitest";
import {
  CONNECTOR_CATALOG,
  REQUIRED_CONNECTOR_IDS,
  addConnector,
  isConnectorSetupReady,
  removeConnector,
} from "@/lib/connectors";

describe("connector setup", () => {
  it("shows ten real Merge examples with only the three profile sources enabled", () => {
    expect(CONNECTOR_CATALOG).toHaveLength(10);
    expect(
      CONNECTOR_CATALOG.filter((connector) => connector.enabled).map(
        (connector) => connector.id
      )
    ).toEqual(["google-calendar", "drive", "slack"]);
    expect(REQUIRED_CONNECTOR_IDS).toEqual([
      "google-calendar",
      "drive",
      "slack",
    ]);
    expect(CONNECTOR_CATALOG.filter((connector) => !connector.enabled)).toHaveLength(
      7
    );
    expect(new Set(CONNECTOR_CATALOG.map((connector) => connector.id)).size).toBe(
      CONNECTOR_CATALOG.length
    );
  });

  it("adds enabled connectors once and ignores preview-only connectors", () => {
    expect(addConnector([], "google-calendar")).toEqual(["google-calendar"]);
    expect(addConnector(["google-calendar"], "google-calendar")).toEqual([
      "google-calendar",
    ]);
    expect(addConnector(["google-calendar"], "notion")).toEqual([
      "google-calendar",
    ]);
  });

  it("requires all three enabled connectors before analysis can start", () => {
    expect(isConnectorSetupReady(["google-calendar", "drive"])).toBe(false);
    expect(
      isConnectorSetupReady(["slack", "google-calendar", "drive"])
    ).toBe(true);
    expect(removeConnector(["google-calendar", "drive"], "drive")).toEqual([
      "google-calendar",
    ]);
  });
});
