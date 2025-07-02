#!/usr/bin/env node

import { cwd } from 'process';
import chalk from 'chalk';
import { simpleGit as git } from 'simple-git';
import prompts from 'prompts';

const simpleGit = git(cwd());
console.log(cwd());
import deleteSquashMergedBranches from './delete-squashed-merged-branches.js';

const run = async () => {
    const branchInfo = await simpleGit.branch();
    const branches = branchInfo.all;

    const { baseBranch, runType } = await prompts([
        {
            type: 'autocomplete',
            name: 'baseBranch',
            message: `Pick your ${chalk.red(
                'base branch'
            )}. We'll check if your feature branches can be deleted based on if their changesets are found in the ${chalk.red(
                'base branch'
            )}.`,
            choices: branches.map((branch) => ({
                title: branch,
                value: branch
            }))
        },
        {
            type: 'select',
            name: 'runType',
            message: 'What do you want to do with squash-merged we find?',
            choices: [
                { title: 'List them out', value: 'dry' },
                { title: 'Actually delete them', value: 'delete' }
            ]
        }
    ]);

    return deleteSquashMergedBranches(baseBranch, runType === 'delete');
};

run();

export default run;
