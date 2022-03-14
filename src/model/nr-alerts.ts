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
  incident_preference: string;
  name: string;
}
