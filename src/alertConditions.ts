import fs from 'fs';
import path from 'path';

import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import { print } from 'graphql';

import { objectToKey } from './utils/stringUtils';
import {
  AlertConditionNerdGraph,
  AlertOpMode,
  AlertPolicyNerdGraph,
  Environment,
} from './model/nr-alerts';
import { config } from './config';
import {
  CREATE_POLICY_CONDITION,
  QUERY_POLICY_CONDITIONS,
  UPDATE_POLICY_CONDITION,
} from './queries';

export async function syncConditions(env: Environment) {
  dotenv.config();
  const apiKey = process.env.NR_API_KEY!;
  const policyFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_POLICY_FILEPATH
      : config.PROD_POLICY_FILEPATH;
  const conditionsFolderPath =
    env == Environment.ALPHA
      ? config.ALPHA_CONDITIONS_FILEPATH
      : config.PROD_CONDITIONS_FILEPATH;
  const conditionFilenameMap = new Map<string, AlertConditionNerdGraph>();
  let remotePolicyConditions: AlertConditionNerdGraph[];

  // Parse local conditions list, populate map: filename -> condition
  const conditionJsonsInLocal = fs
    .readdirSync(conditionsFolderPath)
    .filter((file) => path.extname(file) === '.json');

  conditionJsonsInLocal.forEach((conditionJsonFilename) => {
    const fileData = fs.readFileSync(
      path.join(conditionsFolderPath, conditionJsonFilename)
    );
    const localCondition = JSON.parse(
      fileData.toString()
    ) as AlertConditionNerdGraph;
    conditionFilenameMap.set(conditionJsonFilename, localCondition);
  });

  // Update conditions by policy
  const policyJsonsInLocal = fs
    .readdirSync(policyFolderPath)
    .filter((file) => path.extname(file) === '.json');

  policyJsonsInLocal.forEach(async (policyJsonFilename) => {
    const fileData = fs.readFileSync(
      path.join(policyFolderPath, policyJsonFilename)
    );
    const localPolicy = JSON.parse(fileData.toString()) as AlertPolicyNerdGraph;

    // Gather local conditions for the policy
    const localPolicyConditions = new Map(
      [...conditionFilenameMap].filter(
        (condMap) => condMap[1].policyId == localPolicy.id
      )
    );

    // Gather remote conditions for the policy
    await axios
      .post(
        'https://api.eu.newrelic.com/graphql',
        {
          query: print(QUERY_POLICY_CONDITIONS),
          variables: {
            accountId: config.NR_ACCOUNT_ID,
            searchCriteria: {
              policyId: localPolicy.id,
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
          `Error occurred when fetching alert conditions for policy ${localPolicy.id}:`
        );
        console.log(resp.data.errors);
        throw Error(
          'AlertSync: Error occurred when fetching alert conditions for a policy'
        );
      });

    // Step through each local condition:
    // - determine create/update (delete comes later after loop)
    // - execute it with the API
    // - update local with auto-updated remote fields (e.g. ID)
    localPolicyConditions.forEach(
      async (localCondition, localConditionFilename) => {
        const correspondingRemoteCondition = remotePolicyConditions.find(
          (remoteCondition) => {
            if (localCondition.id) {
              return localCondition.id == remoteCondition.id!; // Remote condition ID always exists
            } else {
              return localCondition.name == remoteCondition.name; // Remote condition name always exists
            }
          }
        );

        if (correspondingRemoteCondition) {
          // Update case
          if (
            localCondition.id &&
            objectToKey({ localCondition }) !==
              objectToKey({ correspondingRemoteCondition })
          ) {
            await syncCondition(
              env,
              localCondition,
              localConditionFilename,
              apiKey,
              AlertOpMode.UPDATE
            );
          }
        } else {
          // Creation case
          await syncCondition(
            env,
            localCondition,
            localConditionFilename,
            apiKey,
            AlertOpMode.CREATE
          );
        }
      }
    );
  });

  console.log(
    'Alert Condition sync procedure complete (with or without actions)'
  );
}

async function syncCondition(
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
