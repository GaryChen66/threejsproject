#!/usr/bin/env node

// Basic isolated tests runner
// Ensures each test file is run in distinct process and does not interfere with other test runs.
// To be used to confirm test files do not introduce and work by chance of side effects
// Temporary solution until we migrate to runner which provides that (reliably) on its own

'use strict';

process.on('unhandledRejection', err => {
  throw err;
});

const globby = require('globby');
const spawn = require('child-process-ext/spawn');
const chalk = require('chalk');
const pLimit = require('p-limit');

const shouldApplyFsCleanupCheck = (() => {
  const argIndex = process.argv.indexOf('--skip-fs-cleanup-check');
  if (argIndex === -1) return true;
  process.argv.splice(argIndex, 1);
  return false;
})();

const patterns = process.argv.length <= 2 ? ['**/*.test.js'] : process.argv.slice(2);
patterns.push('!node_modules/**');

const resolveGitStatus = () =>
  spawn('git', ['status', '--porcelain']).then(
    ({ stdoutBuffer }) => String(stdoutBuffer),
    error => {
      process.stdout.write(error.stdoutBuffer);
      process.stderr.write(error.stderrBuffer);
      throw error;
    }
  );

const initialGitStatusDeferred = shouldApplyFsCleanupCheck ? resolveGitStatus() : null;

const initialSetupDeferred = shouldApplyFsCleanupCheck
  ? initialGitStatusDeferred
  : Promise.resolve();

globby(patterns).then(paths => {
  if (!paths.length) {
    process.stderr.write(chalk.red.bold('No test files matched\n\n'));
    process.exit(1);
  }

  const processesCount = shouldApplyFsCleanupCheck
    ? 1
    : Math.max(require('os').cpus().length - 1, 1);

  const isMultiProcessRun = processesCount > 1;

  const { ongoing, cliFooter } = (() => {
    if (!isMultiProcessRun) return {};
    return { ongoing: new Set(), cliFooter: require('cli-progress-footer')() };
  })();

  const run = path => {
    if (isMultiProcessRun) {
      ongoing.add(path);
      cliFooter.updateProgress(Array.from(ongoing));
    }

    const onFinally = (() => {
      if (isMultiProcessRun) {
        return ({ stdoutBuffer, stderrBuffer }) => {
          ongoing.delete(path);
          cliFooter.updateProgress(Array.from(ongoing));
          process.stdout.write(stdoutBuffer);
          process.stderr.write(stderrBuffer);
          return Promise.resolve();
        };
      }
      if (!shouldApplyFsCleanupCheck) return () => Promise.resolve();
      return () =>
        Promise.all([initialGitStatusDeferred, resolveGitStatus()]).then(
          ([initialStatus, currentStatus]) => {
            if (initialStatus !== currentStatus) {
              process.stderr.write(
                chalk.red.bold(`${path} didn't clean created temporary files\n\n`)
              );
              process.exit(1);
            }
          }
        );
    })();

    return spawn('npx', ['mocha', path], {
      stdio: isMultiProcessRun ? null : 'inherit',
      env: {
        APPDATA: process.env.APPDATA,
        FORCE_COLOR: '1',
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        USERPROFILE: process.env.USERPROFILE,
      },
    }).then(onFinally, error => {
      if (isMultiProcessRun) ongoing.clear();
      return onFinally(error).then(() => {
        process.stderr.write(chalk.red.bold(`${path} failed\n\n`));
        if (error.code <= 2) process.exit(error.code);
        throw error;
      });
    });
  };

  const limit = pLimit(processesCount);
  return initialSetupDeferred.then(() => Promise.all(paths.map(path => limit(() => run(path)))));
});
