/**
 * @author Jacques Favreau (@betaorbust)
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
import { spawn } from 'child_process';
import assert from 'assert';
import * as p from '@clack/prompts';
import chalk from 'chalk';

async function asyncFilter<T>(
    array: T[],
    callback: (item: T, index: number, array: T[]) => Promise<boolean> | boolean
): Promise<T[]> {
    const results = await Promise.all(array.map(callback));
    return array.filter((_, index) => results[index]);
}

/**
 * Calls `git` with the given arguments from the CWD
 * @param  A list of arguments
 * @returns The output from `git`
 */
async function git(args: string[]) {
    return new Promise<string>((resolve, reject) => {
        const child = spawn('git', args);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => (stdout += data));
        child.stderr.on('data', (data) => (stderr += data));

        child.on('close', (exitCode) =>
            exitCode ? reject(stderr) : resolve(stdout)
        );
    }).then((stdout) => stdout.replace(/\n$/, ''));
}

/**
 * Async function for deleting squash-merged branches.
 * @param {string} baseBranchName  The branch to use to see if other branches have been merged in. Usually "master"
 * @param {boolean} [actuallyDoIt] Optional bool to actually delete branches. Default is to just list them.
 * @returns {promise}              Promise that resolves when everything is done.
 */
async function deleteSquashedMergedBranches(
    baseBranchName: string,
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
        async (branchName) => {
            try {
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
            } catch {
                p.log.error(
                    `ERROR RUNNING ANALYSIS ON BRANCH "${branchName}". SKIPPING.`
                );
                return false;
            }
        }
    );
    if (branchesToDelete.length === 0) {
        p.log.warn('No squash-merged branches found. Nothing to delete.');
    } else if (!actuallyDoIt) {
        p.note(
            branchesToDelete.map((branch) => `  ${branch}`).join('\n'),
            'List of branches to delete:'
        );
        p.log.info(
            'To delete these branches, you can run the following command:'
        );
        p.log.info(
            chalk.bold(`   git branch -D ${branchesToDelete.join(' ')}
`),
            { withGuide: false }
        );
    } else {
        await git(['checkout', baseBranchName]);
        const task = p.taskLog({
            title: 'Deleting branches...'
        });
        for (const branchName of branchesToDelete) {
            const deleted = await git(['branch', '-D', branchName]);
            task.message(deleted);
        }
        task.success(`${chalk.bold('Success:')} Identified branches deleted!`, {
            showLog: true
        });
    }
    p.outro('Done! 🎉');
}
export default deleteSquashedMergedBranches;
