/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as karma from 'karma';

import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

const CONTINUOUS = process.env.CONTINUOUS_TEST === 'true';
const HEADFUL = process.env.HEADFUL_TEST === 'true';

import * as MockIPFS from '../src/main';
const adminServer = MockIPFS.getAdminServer();

adminServer.start().then(async () => {
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
            external: ['http-encoding'],
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
        await adminServer.stop();
    });

    await karmaServer.start();
}).catch(e => {
    console.error(e);
    process.exit(1);
});