/**
 * @author Jacques Favreau (@betaorbust)
 * @version 1.0.0
 * @overview A no-dependency node utility to delete branches that have already
 * been merged into a mainline via the squash-merge strategy. (Frequently [used
 * on Github](https://blog.github.com/2016-04-01-squash-your-commits/).)
 *
 * Usage:
 * See https://gist.github.com/betaorbust/6bef07dfd35fb240c8d19fb1bf7f5e04/
 *
 * Acknowledgments:
 * Git logic from @not-an-aardvark's awesome bluebird-based implementation.
 * https://github.com/not-an-aardvark/git-delete-squashed
 *
 */

'use strict';
const childProcess = require('child_process');
const assert = require('assert');
const { red } = require('chalk');
// A set of async helper functions for working with arrays
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

async function asyncMap(array, callback) {
    return Promise.all(array.map(callback));
}

async function asyncFilter(array, callback) {
    const transformedValues = await asyncMap(array, callback);
    return array.filter((element, index) => {
        return !!transformedValues[index];
    });
}

/**
 * Calls `git` with the given arguments from the CWD
 * @param {string[]} args A list of arguments
 * @returns {Promise<string>} The output from `git`
 */
async function git(args) {
    return new Promise((resolve, reject) => {
        const child = childProcess.spawn('git', args);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => (stdout += data));
        child.stderr.on('data', data => (stderr += data));

        child.on(
            'close',
            exitCode => (exitCode ? reject(stderr) : resolve(stdout))
        );
    }).then(stdout => stdout.replace(/\n$/, ''));
}

/**
 * Async function for deleting squash-merged branches.
 * @param {string} baseBranchName  The branch to use to see if other branches have been merged in. Usually "master"
 * @param {boolean} [actuallyDoIt] Optional bool to actually delete branches. Default is to just list them.
 * @returns {promise}              Promise that resolves when everything is done.
 */
async function deleteSquashedMergedBranches(
    baseBranchName,
    actuallyDoIt = false
) {
    assert(
        baseBranchName &&
            typeof baseBranchName === 'string' &&
            baseBranchName.trim() !== '',
        'First param is required and a string of the base branch (usually "master")'
    );
    assert(
        actuallyDoIt === undefined || typeof actuallyDoIt === 'boolean',
        'Second, optional parameter is a boolean indicating to actually delete the branches.'
    );

    const branchListOutput = await git([
        'for-each-ref',
        'refs/heads/',
        '--format=%(refname:short)'
    ]);
    const branchNames = branchListOutput.split('\n');
    if (branchNames.indexOf(baseBranchName) === -1) {
        throw new Error(
            `fatal: no branch named '${baseBranchName}' found in this repo`
        );
    }

    const branchesToDelete = await asyncFilter(
        branchNames,
        async branchName => {
            const [ancestorHash, treeId] = await Promise.all([
                git(['merge-base', baseBranchName, branchName]),
                git(['rev-parse', `${branchName}^{tree}`])
            ]);
            const danglingCommitId = await git([
                'commit-tree',
                treeId,
                '-p',
                ancestorHash,
                '-m',
                `Temp commit for ${branchName}`
            ]);
            const output = await git([
                'cherry',
                baseBranchName,
                danglingCommitId
            ]);
            return output.startsWith('-');
        }
    );
    if (!actuallyDoIt) {
        console.log('Listing branches to delete:');
        if (branchesToDelete.length === 0) {
            console.log(red('No local branches can be safely removed.'));
        }
        console.log(branchesToDelete);
    } else {
        await git(['checkout', baseBranchName]);
        asyncForEach(branchesToDelete, async branchName => {
            const deleted = await git(['branch', '-D', branchName]);
            console.log(deleted);
            return deleted;
        });
    }
}
module.exports = deleteSquashedMergedBranches;
