#!/usr/bin/env node

const process = require('process');
const inquirer = require('inquirer');
const { red } = require('chalk');
const simpleGit = require('simple-git/promise')(process.cwd());
console.log(process.cwd());
const deleteSquashMergedBranches = require('./delete-squashed-merged-branches');

inquirer.registerPrompt(
    'autocomplete',
    require('inquirer-autocomplete-prompt')
);

const run = async () => {
    const branchInfo = await simpleGit.branch();
    const branches = branchInfo.all;
    const answers = await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'baseBranch',
            message: `Pick your ${red(
                'base branch'
            )}. We'll check if your feature branches can be deleted based on if its changes are found in the ${red(
                'base branch'
            )}.`,
            source: function(answersSoFar, input) {
                return Promise.resolve(
                    input
                        ? branches.filter(branch => branch.indexOf(input) > -1)
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
