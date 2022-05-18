/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect } from 'chai';
import { CID } from 'ipfs-http-client';
import {
    mockCid,
    resetMockCidCounter
} from '../src/utils/ipfs';

describe("Mock CIDs", () => {

    beforeEach(() => {
        resetMockCidCounter();
    });

    it("should start at 1 by default", () => {
        expect(mockCid()).to.equal(
            `QmPXXXXXXXXXXXXXXmockXipfsXcid1XXXXXXXXXXXXXXX`
        );
    });

    it("should generate valid CIDs", () => {
        const id = mockCid();
        const cid = CID.parse(id);

        expect(cid.toString()).to.equal(id);
        expect(cid.version).to.equal(0);
    });

    it("should count default ids into double digits", () => {
        const ids = [...new Array(22).keys()]
            .map(() => mockCid());

        expect(ids).to.deep.equal([
            'QmPXXXXXXXXXXXXXXmockXipfsXcid1XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid2XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid3XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid4XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid5XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid6XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid7XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid8XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid9XXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid1AXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid11XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid12XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid13XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid14XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid15XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid16XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid17XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid18XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid19XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid2AXXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid21XXXXXXXXXXXXXX',
            'QmPXXXXXXXXXXXXXXmockXipfsXcid22XXXXXXXXXXXXXX'
        ]);
    });

    it("should allow custom values", () => {
        expect(mockCid("customXcid")).to.equal(
            `QmPXXXXXXXXXXXXXXXXcustomXcidXXXXXXXXXXXXXXXXX`
        );
    });

    it("should reject invalid chars explicitly", () => {
        expect(() => mockCid("INVALID VALUE")).to.throw(
            "Mock CID content must be base58btc"
        );
    });

    it("should not increment the counter for custom values", () => {
        mockCid("customXcid");
        mockCid("customXcid");
        mockCid("customXcid");

        expect(mockCid()).to.equal(
            `QmPXXXXXXXXXXXXXXmockXipfsXcid1XXXXXXXXXXXXXXX`
        );
    });

});