/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { requestHandlerDefinitions } from 'mockttp';

declare const WorkerGlobalScope: Function | undefined;
export const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
export const isWeb = typeof Window !== 'undefined' && self instanceof Window;
export const isNode = !isWorker && !isWeb && typeof process === 'object' && process.version;

// Get the length of the given data in bytes, not characters.
// If that's a buffer, the length is used raw, but if it's a string
// it returns the length when encoded as UTF8.
export function byteLength(input: string | Uint8Array | Buffer) {
    if (typeof input === 'string') {
        return isNode
            ? Buffer.from(input, 'utf8').byteLength
            : new Blob([input]).size;
    } else {
        return input.length;
    }
}

// Using the exact headers here is useful for correctness, but also important because in Node 18 Undici
// has bugs where it doesn't handle some responses correctly (no explicit length, close without warning).
// See https://github.com/nodejs/undici/issues/1414 and https://github.com/nodejs/undici/issues/1415.
export const buildIpfsFixedValueDefaultHeaders = (body: string) => ({
    'cache-control': 'no-cache',
    'connection': 'close',
    'date': new Date().toUTCString(),
    'content-type': 'application/json; charset=utf-8',
    'content-length': byteLength(body).toString(),
});

export const buildIpfsStreamDefaultHeaders = () => ({
    'cache-control': 'no-cache',
    'connection': 'close',
    'date': new Date().toUTCString(),
    'content-type': 'application/json; charset=utf-8',
    'transfer-encoding': 'chunked',
    // 'trailer': 'X-Stream-Error',
    // ^ This is normally present but we skip it for now, since it causes issues with Node 18:
    // https://github.com/nodejs/undici/issues/1418
    'x-chunked-output': '1'
});

export const buildIpfsFixedValueResponse = (status: number, json: any) => {
    const jsonBody = JSON.stringify(json);
    return {
        status,
        headers: buildIpfsFixedValueDefaultHeaders(jsonBody),
        body: jsonBody
    }
};

export const buildIpfsStreamResponse = (status: number, ...jsonValues: Array<any>) => {
    const body = jsonValues.map(json => JSON.stringify(json)).join('\n');
    return {
        status,
        headers: buildIpfsStreamDefaultHeaders(),
        body: body
    }
};

export class IpfsFixedResponseHandlerDefinition extends requestHandlerDefinitions.SimpleHandlerDefinition {

    constructor(
        status: number,
        json: any
    ) {
        const jsonBody = JSON.stringify(json);
        super(status, undefined, jsonBody, buildIpfsFixedValueDefaultHeaders(jsonBody));
    }
};

export class IpfsStreamHandlerDefinition extends requestHandlerDefinitions.SimpleHandlerDefinition {

    constructor(
        status: number,
        ...jsonValues: Array<any>
    ) {
        const body = jsonValues.map(json => JSON.stringify(json)).join('\n');
        super(status, undefined, body, buildIpfsStreamDefaultHeaders());
    }
};