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
