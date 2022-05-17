/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { requestHandlerDefinitions, Headers } from 'mockttp';
import * as multipart from 'parse-multipart-data';

import { byteLength } from './util';


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

export interface MultipartPart {
    filename?: string;
    type: string;
    data: Buffer;
}

export function parseMultipartBody(
    body: Buffer,
    headers: Headers
): Array<MultipartPart> {
    // This is closely related to the code in Mockttp's MultipartFormDataMatcher
    const contentType = headers['content-type'];

    if (!contentType || !contentType.includes("multipart/form-data")) {
        throw new Error("Could not parse multipart body without multipart content-type header");
    }

    const boundary = contentType.match(/;\s*boundary=(\S+)/);
    if (!boundary) throw new Error("Could not parse multipart body with bad multipart content-type");

    return multipart.parse(body, boundary[1]);
}