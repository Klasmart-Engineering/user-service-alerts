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

export const QUERY_CONDITIONS_FOR_POLICY = gql`
  query fetchConditionsForPolicy(
    $accountId: Int!
    $searchCriteria: AlertsNrqlConditionsSearchCriteriaInput
  ) {
    actor {
      account(id: $accountId) {
        alerts {
          nrqlConditionsSearch(searchCriteria: $searchCriteria) {
            nrqlConditions {
              id
              name
              enabled
              nrql {
                query
              }
              policyId
              runbookUrl
              type
              terms {
                threshold
                thresholdDuration
                operator
                priority
                thresholdOccurrences
              }
              signal {
                aggregationDelay
                aggregationMethod
                aggregationWindow
              }
            }
          }
        }
      }
    }
  }
`;
