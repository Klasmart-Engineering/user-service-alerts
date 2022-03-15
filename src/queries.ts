import gql from 'graphql-tag';

export const QUERY_POLICIES = gql`
  query fetchPolicies($accountId: Int!) {
    actor {
      account(id: $accountId) {
        alerts {
          policiesSearch {
            policies {
              accountId
              id
              name
              incidentPreference
            }
          }
        }
      }
    }
  }
`;

export const UPDATE_POLICY = gql`
  mutation updatePolicy(
    $accountId: Int!
    $id: ID!
    $policy: AlertsPolicyUpdateInput!
  ) {
    alertsPolicyUpdate(accountId: $accountId, id: $id, policy: $policy) {
      accountId
      id
      incidentPreference
      name
    }
  }
`;

export const CREATE_POLICY = gql`
  mutation createPolicy($accountId: Int!, $policy: AlertsPolicyInput!) {
    alertsPolicyCreate(accountId: $accountId, policy: $policy) {
      accountId
      id
      incidentPreference
      name
    }
  }
`;
