export enum AlertOpMode {
    CREATE = 'Create',
    UPDATE = 'Update',
}

export interface AlertPolicy {
    id?: number
    incident_preference: string
    name: string
    created_at?: number
    updated_at?: number
}