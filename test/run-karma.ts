/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as karma from 'karma';

import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

import { ipfsNodePromise } from './run-test-ipfs-node';

const CONTINUOUS = process.env.CONTINUOUS_TEST === 'true';
const HEADFUL = process.env.HEADFUL_TEST === 'true';

import * as MockIPFS from '../src/main';
const adminServer = MockIPFS.getAdminServer();

Promise.all([
    ipfsNodePromise,
    adminServer.start()
]).then(async ([ipfsNode]) => {
    const config = await karma.config.parseConfig(undefined, {
        frameworks: ['mocha', 'chai'],
        files: [
            'test/**/*.spec.ts'
        ],
        preprocessors: {
            'src/**/*.ts': ['esbuild'],
            'test/**/*.ts': ['esbuild']
        },
        esbuild: {
            format: 'esm',
            target: 'esnext',
            define: {
                IPFS_NODE_ADDRESS: JSON.stringify(ipfsNode.httpUrl)
            },
            external: [
                'http-encoding',
                './run-test-ipfs-node'
            ],
            plugins: [
                NodeModulesPolyfillPlugin(),
                NodeGlobalsPolyfillPlugin({
                    process: true,
                    buffer: true
                })
            ]
        },
        plugins: [
            'karma-chrome-launcher',
            'karma-chai',
            'karma-mocha',
            'karma-spec-reporter',
            'karma-esbuild'
        ],
        reporters: ['spec'],
        port: 9876,
        logLevel: karma.constants.LOG_INFO,

        browsers: HEADFUL
            ? ['Chrome']
            : ['ChromeHeadless'],

        autoWatch: CONTINUOUS,
        singleRun: !CONTINUOUS
    } as karma.ConfigOptions, { throwErrors: true });

    const karmaServer = new karma.Server(config, async () => {
        await Promise.all([
            ipfsNode.shutdown(),
            adminServer.stop()
        ])
    });

    await karmaServer.start();
    karmaServer.on('run_complete', (_browsers, results) => {
        process.exit(results.exitCode);
    });
}).catch(e => {
    console.error(e);
    process.exit(1);
});