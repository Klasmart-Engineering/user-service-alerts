import fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import { print } from 'graphql';
import { config } from '../config';
import {
  AlertConditionNerdGraph,
  AlertOpMode,
  Environment,
} from '../model/nr-alerts';
import {
  CREATE_POLICY_CONDITION,
  QUERY_POLICY_CONDITIONS,
  UPDATE_POLICY_CONDITION,
} from '../queries';

export async function fetchRemotePolicyConditions(
  remotePolicyConditions: AlertConditionNerdGraph[],
  localPolicyId: string,
  apiKey: string
) {
  await axios
    .post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(QUERY_POLICY_CONDITIONS),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
          searchCriteria: {
            policyId: localPolicyId,
          },
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    )
    .then((resp) => {
      remotePolicyConditions = resp.data.data.actor.account.alerts
        .nrqlConditionsSearch.nrqlConditions as AlertConditionNerdGraph[];
    })
    .catch((resp) => {
      console.log(
        `Error occurred when fetching alert conditions for policy ${localPolicyId}:`
      );
      console.log(resp.data.errors);
      throw Error(
        'AlertSync: Error occurred when fetching alert conditions for a policy'
      );
    });

  return remotePolicyConditions;
}

export async function syncCondition(
  env: Environment,
  localCondition: AlertConditionNerdGraph,
  conditionJsonFilename: string,
  apiKey: string,
  mode: AlertOpMode
) {
  const conditionsFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_CONDITIONS_FILEPATH
      : config.PROD_CONDITIONS_FILEPATH;
  const mutationName =
    mode == AlertOpMode.UPDATE
      ? 'alertsNrqlConditionStaticUpdate'
      : 'alertsNrqlConditionStaticCreate';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nrResponse: Promise<AxiosResponse<any>>;

  if (mode == AlertOpMode.UPDATE) {
    nrResponse = axios.post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(UPDATE_POLICY_CONDITION),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
          id: localCondition.id,
          condition: {
            enabled: localCondition.enabled,
            name: localCondition.name,
            nrql: {
              query: localCondition.nrql.query,
            },
            runbookUrl: localCondition.runbookUrl,
            signal: {
              aggregationDelay: localCondition.signal?.aggregationDelay,
              aggregationMethod: localCondition.signal?.aggregationMethod,
              aggregationWindow: localCondition.signal?.aggregationWindow,
            },
            terms: [
              {
                operator: localCondition.terms[0].operator,
                priority: localCondition.terms[0].priority,
                threshold: localCondition.terms[0].threshold,
                thresholdDuration: localCondition.terms[0].thresholdDuration,
                thresholdOccurrences:
                  localCondition.terms[0].thresholdOccurrences,
              },
            ],
          },
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    );
  } else if (mode == AlertOpMode.CREATE) {
    nrResponse = axios.post(
      'https://api.eu.newrelic.com/graphql',
      {
        query: print(CREATE_POLICY_CONDITION),
        variables: {
          accountId: config.NR_ACCOUNT_ID,
          policyId: localCondition.policyId,
          condition: {
            enabled: localCondition.enabled,
            name: localCondition.name,
            nrql: {
              query: localCondition.nrql.query,
            },
            runbookUrl: localCondition.runbookUrl,
            signal: {
              aggregationDelay: localCondition.signal?.aggregationDelay,
              aggregationMethod: localCondition.signal?.aggregationMethod,
              aggregationWindow: localCondition.signal?.aggregationWindow,
            },
            terms: [
              {
                operator: localCondition.terms[0].operator,
                priority: localCondition.terms[0].priority,
                threshold: localCondition.terms[0].threshold,
                thresholdDuration: localCondition.terms[0].thresholdDuration,
                thresholdOccurrences:
                  localCondition.terms[0].thresholdOccurrences,
              },
            ],
          },
        },
      },
      {
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      }
    );
  } else {
    throw Error('AlertSync: Invalid sync mode specified');
  }

  // Write response back to local data (e.g. add ID if condition created)
  await nrResponse
    .then((resp) => {
      const remoteCondition = JSON.stringify(
        resp.data.data[`${mutationName}`] as AlertConditionNerdGraph
      );
      fs.writeFile(
        path.join(conditionsFolderPath, conditionJsonFilename),
        remoteCondition,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );
      console.log(`[${mutationName}]: ${conditionJsonFilename} processed`);
    })
    .catch((resp) => {
      console.log(
        `Error occurred during ${mutationName} operation on ${conditionJsonFilename}:`
      );
      console.log(resp.data.errors);
      throw Error('AlertSync: Error occurred when syncing alert conditions');
    });
}
