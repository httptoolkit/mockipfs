/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { AbortController } from "node-abort-controller";
// @ts-ignore
globalThis.AbortController ??= AbortController;

import { expect } from "chai";

import type * as IPFS from "ipfs";
import * as IpfsClient from "ipfs-http-client";
import {
    RemotePinService,
    RemotePinServiceWithStat
} from "ipfs-core-types/src/pin/remote/service";

import itAll = require('it-all');
import {
    concat as uint8ArrayConcat,
    toString as uint8ToString
} from 'uint8arrays';

export { HTTPError } from "ipfs-utils/src/http";

import * as MockIPFS from '../src/main';
import { isNode, delay } from "../src/utils/util";
export {
    expect,
    MockIPFS,
    IpfsClient,
    itAll,
    uint8ArrayConcat,
    uint8ToString,
    delay
};

export const EXAMPLE_CID = 'QmY7Yh4UquoXHLPFo2XbhXkhBvFoPwmQUSa92pxnxjQuPU';
export const ALTERNATE_CID = 'QmY7Yh4UquoXHLPFo2XbhXkhBvFoPwmQUSa92pxnxjQABC';
export const EXAMPLE_SERVICE = { service: 'foo', endpoint: new URL('http://localhost:9876/') };
export const EXAMPLE_ALT_SERVICE = { service: 'bar', endpoint: new URL('http://localhost:6789/') };

export const normalizeService = function (service: RemotePinServiceWithStat | RemotePinService) {
    const _service = { ...service, endpoint: service.endpoint.toString() };
    return _service;
};

export const itValue = async <T>(asyncIterable: AsyncIterable<T>|Iterable<T>): Promise<T> => {
    const values = await itAll(asyncIterable);

    expect(values.length).to.equal(1, `Expected iterable to have exactly 1 value, but it had ${
        values.length
    }: ${
        values.map(v => JSON.stringify(v)).join(', ')
    }`);

    return values[0];
};

export type RealIpfsClient = IPFS.IPFS | IpfsClient.IPFSHTTPClient;
export let realIpfsNodePromise: Promise<RealIpfsClient>;

if (isNode) {
    // We start a real IPFS node in-process, for proxy tests, but we don't wait
    // for startup until the proxy test itself
    let nodeSetupPromise = import('./run-test-ipfs-node')
        .then(m => m.ipfsNodePromise);

    realIpfsNodePromise = nodeSetupPromise.then(({ node }) => node);

    after(async () => {
        await (await nodeSetupPromise).shutdown();
    });
} else {
    // In the browser, this is launched & shutdown independently by Karma, we just create a client:
    realIpfsNodePromise = Promise.resolve(
        IpfsClient.create({ url: IPFS_NODE_ADDRESS })
    );
}
declare const IPFS_NODE_ADDRESS: string; // Inject in browsers by Esbuild via Karma