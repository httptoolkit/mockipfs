/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

// Global counter used to generate maybe-unique easy to understand ids
let mockCidIdCounter = 1;
const nextMockCidId = () => {
    let id = mockCidIdCounter++;

    // We can't use simple numeric ids, because 0 is banned in base58btc. To handle this,
    // we just convert 0 into A, and always start at 1 (not A) to help make the pattern
    // clearer: 8, 9, 1A, 11, 12, 13...

    return id.toString().replace('0', 'A');
};

// Used just for unit testing this logic, not exposed
export const resetMockCidCounter = () => {
    mockCidIdCounter = 1;
};

/**
 * A quick helper to generate a v0 CID containing a readable string, for easy testing
 * & debugging.
 *
 * If an argument is provided, it will be inserted in the string and padded with X
 * characters to make it a valid CID. The string must be Base58btc, so must be
 * alphanumeric minus the Il0O characters.
 *
 * If no argument is provided, a simple process-unique CID will be created, containing
 * "mockXipfsXcid" followed by an incrementing numeric id (using A instead of 0, which
 * is not valid base58btc). This is not globally unique like a UUID, but is intended
 * to provide easy debugging when tracing ids in a test run or similar.
 */
export const mockCid = (value: string = 'mockXipfsXcid' + nextMockCidId()) => {
    if (value.length > 43) throw new Error('Mock CID content must be 43 chars max')
    if (value && !value.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
        throw new Error('Mock CID content must be base58btc');
    }

    const missingLength = 43 - value.length;

    value = value.padStart(value.length + missingLength / 2, 'X');
    value = value.padEnd(43, 'X');

    return 'QmP' + value;
    // ^ Base58btc, cidv1, dag-pb, sha1, arbitrary base58btc (no +/Il0O)
    // Would be more flexible to use Base64, but isn't decodeable by default
};