export enum AlertOpMode {
  CREATE = 'Create',
  UPDATE = 'Update',
}

export enum Environment {
  ALPHA = 'Alpha',
  PROD = 'Prod',
}

export interface AlertPolicyNerdGraph {
  accountId: number;
  id?: string;
  incidentPreference: string;
  name: string;
}

export interface AlertConditionNerdGraph {
  enabled: boolean;
  id?: string;
  name: string;
  nrql: {
    query: string;
  };
  policyId?: string;
  runbookUrl?: string;
  signal?: {
    aggregationDelay: number;
    aggregationMethod: string;
    aggregationWindow: number;
  };
  terms: [
    {
      operator: string;
      priority: string;
      threshold: number;
      thresholdDuration: number;
      thresholdOccurrences: string;
    }
  ];
}

export interface DeletedAlertCondition {
  id: string;
}
