export interface DemoConnector {
  id: string;
  label: string;
  code: string;
  category: string;
  enabled: boolean;
}

export const CONNECTOR_CATALOG: readonly DemoConnector[] = [
  {
    id: "google-calendar",
    label: "Google Calendar",
    code: "CAL",
    category: "Schedule",
    enabled: true,
  },
  {
    id: "drive",
    label: "Google Drive",
    code: "DRV",
    category: "Files",
    enabled: true,
  },
  {
    id: "slack",
    label: "Slack Messages",
    code: "SLK",
    category: "Chat",
    enabled: true,
  },
  {
    id: "gmail",
    label: "Gmail",
    code: "GML",
    category: "Mail",
    enabled: false,
  },
  {
    id: "notion",
    label: "Notion",
    code: "NTS",
    category: "Knowledge",
    enabled: false,
  },
  {
    id: "dropbox",
    label: "Dropbox",
    code: "DBX",
    category: "Files",
    enabled: false,
  },
  {
    id: "salesforce",
    label: "Salesforce",
    code: "SFD",
    category: "CRM",
    enabled: false,
  },
  {
    id: "hubspot",
    label: "HubSpot",
    code: "HSP",
    category: "CRM",
    enabled: false,
  },
  {
    id: "jira",
    label: "Jira",
    code: "JRA",
    category: "Projects",
    enabled: false,
  },
  {
    id: "microsoft-teams",
    label: "Microsoft Teams",
    code: "MST",
    category: "Meetings",
    enabled: false,
  },
];

export const REQUIRED_CONNECTOR_IDS = CONNECTOR_CATALOG.filter(
  (connector) => connector.enabled
).map((connector) => connector.id);

const enabledIds = new Set(REQUIRED_CONNECTOR_IDS);

export function connectorById(id: string): DemoConnector | undefined {
  return CONNECTOR_CATALOG.find((connector) => connector.id === id);
}

export function addConnector(
  selected: readonly string[],
  connectorId: string
): string[] {
  if (!enabledIds.has(connectorId) || selected.includes(connectorId)) {
    return [...selected];
  }
  return [...selected, connectorId];
}

export function removeConnector(
  selected: readonly string[],
  connectorId: string
): string[] {
  return selected.filter((id) => id !== connectorId);
}

export function isConnectorSetupReady(selected: readonly string[]): boolean {
  return REQUIRED_CONNECTOR_IDS.every((id) => selected.includes(id));
}
