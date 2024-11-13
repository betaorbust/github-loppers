#!/usr/bin/env node

import { cwd } from 'process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { simpleGit as git } from 'simple-git';
import autoComplete from 'inquirer-autocomplete-prompt';

const simpleGit = git(cwd());
console.log(cwd());
import deleteSquashMergedBranches from './delete-squashed-merged-branches.js';

inquirer.registerPrompt('autocomplete', autoComplete);

const run = async () => {
    const branchInfo = await simpleGit.branch();
    const branches = branchInfo.all;
    const answers = await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'baseBranch',
            message: `Pick your ${chalk.red(
                'base branch'
            )}. We'll check if your feature branches can be deleted based on if their changesets are found in the ${chalk.red(
                'base branch'
            )}.`,
            source: function (answersSoFar, input) {
                return Promise.resolve(
                    input
                        ? branches.filter(
                              (branch) => branch.indexOf(input) > -1
                          )
                        : branches
                );
            }
        },
        {
            type: 'list',
            name: 'runType',
            message: 'What do you want to do with squash-merged we find?',
            choices: [
                { name: 'List them out', value: 'dry' },
                { name: 'Actually delete them', value: 'delete' }
            ]
        }
    ]);

    return deleteSquashMergedBranches(
        answers.baseBranch,
        answers.runType === 'delete'
    );
};

run();

export default run;
