#!/usr/bin/env node

import { cwd, exit } from 'node:process';
import chalk from 'chalk';
import { simpleGit as git } from 'simple-git';
import * as p from '@clack/prompts';
import deleteSquashMergedBranches from './delete-squashed-merged-branches.js';

const run = async () => {
    const simpleGit = git(cwd());
    const branchInfo = await simpleGit.branch();
    const branches = branchInfo.all;
    console.log('\n\n');

    p.intro(chalk.green('GitHub Loppers'));
    p.box(
        `This tool will identify local branches that have been 
squash-merged into a ${chalk.red('base branch')} and can be safely
deleted without losing any commits.`,
        undefined,
        { rounded: true, width: 'auto' }
    );
    const baseBranch = await p.autocomplete({
        message: `Pick your ${chalk.red(
            'base branch'
        )}. We'll check if your feature branches can be deleted based on if their changesets are found in the ${chalk.red(
            'base branch'
        )}.`,
        options: branches.map((branch) => ({
            label: branch,
            value: branch
        })),
        placeholder: 'Type to filter options'
    });

    if (p.isCancel(baseBranch)) {
        p.cancel('Operation cancelled');
        exit(0);
    }

    const runType = await p.select({
        message: 'What do you want to do with squash-merged branches we find?',
        options: [
            { label: 'List them out', value: 'dry' },
            { label: 'Actually delete them', value: 'delete' }
        ]
    });

    if (p.isCancel(runType)) {
        p.cancel('Operation cancelled');
        exit(0);
    }

    return deleteSquashMergedBranches(baseBranch, runType === 'delete');
};

run();

export default run;
