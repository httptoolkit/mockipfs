import { AbortController } from "node-abort-controller";
global.AbortController = AbortController;

import { expect } from "chai";

import * as IPFS from "ipfs-http-client";

import itAll = require('it-all');
import {
    concat as uint8ArrayConcat,
    toString as uint8ToString
} from 'uint8arrays';

export { HTTPError } from "ipfs-utils/src/http";

import * as MockIPFS from '../src/main';
export {
    expect,
    MockIPFS,
    IPFS,
    itAll,
    uint8ArrayConcat,
    uint8ToString
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

export const delay = (durationMs: number) =>
    new Promise((resolve) => setTimeout(resolve, durationMs));