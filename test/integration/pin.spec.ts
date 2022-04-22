/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    expect,
    MockIPFS,
    IPFS,
    HTTPError,
    delay,
    EXAMPLE_CID,
    ALTERNATE_CID
} from '../test-setup';

describe("IPFS pin mocking", () => {

    const mockNode = MockIPFS.getLocal();

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    describe("for addition", () => {

        it("should return success for additions by default", async () => {
            const ipfsClient = IPFS.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.add(EXAMPLE_CID);

            expect(result.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow timing out for a CID to simulate pinning missing content", async () => {
            await mockNode.forPinAdd(EXAMPLE_CID).thenTimeoutAsUnavailable();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);
            const result = ipfsClient.pin.add(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow timing out for all CIDs to simulate pinning missing content", async () => {
            await mockNode.forPinAdd().thenTimeoutAsUnavailable();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);
            const result = ipfsClient.pin.add(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow making only some specific pins successful", async () => {
            await mockNode.forPinAdd(EXAMPLE_CID).thenPinSuccessfully();
            await mockNode.forPinAdd().thenTimeoutAsUnavailable();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);
            const timeoutResult = ipfsClient.pin.add(ALTERNATE_CID);
            const successResult = ipfsClient.pin.add(EXAMPLE_CID);

            expect(await Promise.race([
                timeoutResult,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
            expect((await successResult).toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow querying the list of added pins", async () => {
            await mockNode.forPinAdd(EXAMPLE_CID).thenPinSuccessfully();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);
            await Promise.all([
                ipfsClient.pin.add(EXAMPLE_CID),
                ipfsClient.pin.add(ALTERNATE_CID),
            ]);

            expect(await mockNode.getAddedPins()).to.deep.equal([
                { cid: EXAMPLE_CID },
                { cid: ALTERNATE_CID }
            ]);
        });

    });

    describe("for rm", () => {

        it("should return success for removal by default", async () => {
            const ipfsClient = IPFS.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.rm(EXAMPLE_CID);

            expect(result.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow mocking pin rm failure", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenFailAsMissing();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.rm(EXAMPLE_CID).catch(e => e);

            expect(result).to.be.instanceOf(HTTPError);
            expect(result.response.status).to.equal(500);
            expect(result.message).to.equal(
                `Failed to remove pin: ${EXAMPLE_CID} is not pinned`
            );
        });

        it("can timeout pin removal resolution", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenTimeout();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);

            const result = ipfsClient.pin.rm(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(500).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow querying the list of removed pins", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenRemoveSuccessfully();

            const ipfsClient = IPFS.create(mockNode.ipfsOptions);
            await Promise.all([
                ipfsClient.pin.rm(EXAMPLE_CID),
                ipfsClient.pin.rm(ALTERNATE_CID),
            ]);

            expect(await mockNode.getRemovedPins()).to.deep.equal([
                { cid: EXAMPLE_CID },
                { cid: ALTERNATE_CID }
            ]);
        });

    });

});