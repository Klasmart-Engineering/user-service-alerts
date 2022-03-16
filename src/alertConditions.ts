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
  CREATE_POLICY,
  QUERY_CONDITIONS_FOR_POLICY,
  UPDATE_POLICY,
} from './queries';
import { stringify } from '@bitauth/libauth';

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

    const remoteConditionsForPolicy = await axios
      .post(
        'https://api.eu.newrelic.com/graphql',
        {
          query: print(QUERY_CONDITIONS_FOR_POLICY),
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
        remoteConditions = resp.data.data.actor.account.alerts.policiesSearch
          .policies as AlertPolicyNerdGraph[];
      })
      .catch((resp) => {
        console.log('Error occurred when fetching alert policies:');
        console.log(resp.data.errors);
        throw Error('AlertSync: Error occurred when fetching alert policies');
      });
  });

  // To be continued
}
