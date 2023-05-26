/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { CID } from 'multiformats/cid';
import {
    expect,
    MockIPFS,
    IpfsClient,
    HTTPError,
    delay,
    EXAMPLE_CID,
    ALTERNATE_CID,
    EXAMPLE_SERVICE,
    EXAMPLE_ALT_SERVICE,
    normalizeService,
    itAll
} from '../test-setup';

describe("IPFS pin mocking", () => {

    const mockNode = MockIPFS.getLocal();

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    describe("for addition", () => {

        it("should return success for additions by default", async () => {
            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.add(EXAMPLE_CID);

            expect(result.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow timing out for a CID to simulate pinning missing content", async () => {
            await mockNode.forPinAdd(EXAMPLE_CID).thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const result = ipfsClient.pin.add(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow timing out for all CIDs to simulate pinning missing content", async () => {
            await mockNode.forPinAdd().thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const result = ipfsClient.pin.add(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow making only some specific pins successful", async () => {
            await mockNode.forPinAdd(EXAMPLE_CID).thenPinSuccessfully();
            await mockNode.forPinAdd().thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
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

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
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

    describe("for remote addition", () => {

        it("should return success for additions by default", async () => {
            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const exampleCid = CID.parse(EXAMPLE_CID);
            const result = await ipfsClient.pin.remote.add(exampleCid, {
              service: 'pinbar',
              name: 'fooz-baz'
            });

            expect(result.cid.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow timing out for a CID to simulate pinning missing content", async () => {
            await mockNode.forPinRemoteAdd(EXAMPLE_CID).thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const exampleCid = CID.parse(EXAMPLE_CID);
            const result = ipfsClient.pin.remote.add(exampleCid, {
              service: 'pinbar',
              name: 'fooz-baz'
            });

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow timing out for all CIDs to simulate pinning missing content", async () => {
            await mockNode.forPinRemoteAdd().thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const exampleCid = CID.parse(EXAMPLE_CID);
            const result = ipfsClient.pin.remote.add(exampleCid, {
              service: 'pinbar',
              name: 'fooz-baz'
            });

            expect(await Promise.race([
                result,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow making only some specific pins successful", async () => {
            await mockNode.forPinRemoteAdd(EXAMPLE_CID).thenPinSuccessfully();
            await mockNode.forPinRemoteAdd().thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const altCid = CID.parse(ALTERNATE_CID);
            const timeoutResult = ipfsClient.pin.remote.add(altCid, {
              service: 'pinbar',
              name: 'fooz-baz'
            });
            const exampleCid = CID.parse(EXAMPLE_CID);
            const successResult = ipfsClient.pin.remote.add(exampleCid, {
              service: 'pinbar',
              name: 'fooz-baz'
            });

            expect(await Promise.race([
                timeoutResult,
                delay(200).then(() => 'timeout')
            ])).to.equal('timeout');
            expect((await successResult).cid.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow querying the list of added pins", async () => {
            await mockNode.forPinRemoteAdd(EXAMPLE_CID).thenPinSuccessfully();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const altCid = CID.parse(ALTERNATE_CID);
            const exampleCid = CID.parse(EXAMPLE_CID);
            await Promise.all([
                ipfsClient.pin.remote.add(exampleCid, {
                  service: 'pinbar',
                  name: 'fooz-baz'
                }),
                ipfsClient.pin.remote.add(altCid, {
                  service: 'pinbar',
                  name: 'fooz-baz'
                }),
            ]);

            expect(await mockNode.getAddedPins()).to.deep.equal([
                { cid: EXAMPLE_CID },
                { cid: ALTERNATE_CID }
            ]);
        });

    });

    describe("for rm", () => {

        it("should return success for removal by default", async () => {
            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.rm(EXAMPLE_CID);

            expect(result.toString()).to.equal(EXAMPLE_CID);
        });

        it("should allow mocking pin rm failure", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenFailAsMissing();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await ipfsClient.pin.rm(EXAMPLE_CID).catch(e => e);

            expect(result).to.be.instanceOf(HTTPError);
            expect(result.response.status).to.equal(500);
            expect(result.message).to.equal(
                `Failed to remove pin: ${EXAMPLE_CID} is not pinned`
            );
        });

        it("can timeout pin removal resolution", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = ipfsClient.pin.rm(EXAMPLE_CID);

            expect(await Promise.race([
                result,
                delay(500).then(() => 'timeout')
            ])).to.equal('timeout');
        });

        it("should allow querying the list of removed pins", async () => {
            await mockNode.forPinRm(EXAMPLE_CID).thenRemoveSuccessfully();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
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

    describe("for ls", () => {

        it("should return an empty list when listing pins by default", async () => {
            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(ipfsClient.pin.ls());

            expect(result).to.deep.equal([]);
        });

        it("should allow mocking the list of pinned hashes", async () => {
            await mockNode.forPinLs().thenReturn([
                { type: 'recursive', cid: EXAMPLE_CID },
                { type: 'indirect', cid: ALTERNATE_CID }
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(ipfsClient.pin.ls());

            expect(
                result.map(({ type, cid }) => ({ type, cid: cid.toString() }))
            ).to.deep.equal([
                { type: 'recursive', cid: EXAMPLE_CID },
                { type: 'indirect', cid: ALTERNATE_CID }
            ]);
        });

        it("should support filtering when mocking the list of pinned hashes", async () => {
            await mockNode.forPinLs().thenReturn([
                { type: 'recursive', cid: ALTERNATE_CID },
                { type: 'direct', cid: EXAMPLE_CID },
                { type: 'indirect', cid: ALTERNATE_CID }
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(ipfsClient.pin.ls({
                type: 'direct'
            }));

            expect(
                result.map(({ type, cid }) => ({ type, cid: cid.toString() }))
            ).to.deep.equal([
                { type: 'direct', cid: EXAMPLE_CID }
            ]);
        });

        it("should support filtering for 'all' when mocking the list of pinned hashes", async () => {
            await mockNode.forPinLs().thenReturn([
                { type: 'recursive', cid: EXAMPLE_CID },
                { type: 'direct', cid: EXAMPLE_CID },
                { type: 'indirect', cid: EXAMPLE_CID }
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(ipfsClient.pin.ls({
                type: 'all'
            }));

            expect(
                result.map(({ type, cid }) => ({ type, cid: cid.toString() }))
            ).to.deep.equal([
                { type: 'recursive', cid: EXAMPLE_CID },
                { type: 'direct', cid: EXAMPLE_CID },
                { type: 'indirect', cid: EXAMPLE_CID }
            ]);
        });

    });

    describe("for remote ls", () => {

        it("should return an empty list when listing remote services by default", async () => {
            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
            const res = await ipfsClient.pin.remote.service.ls();

            const result = await itAll(res);

            expect(result).to.deep.equal([]);
        });

        it("should allow mocking the list of remote services", async () => {
            await mockNode.forPinRemoteLs().thenReturn([
                EXAMPLE_SERVICE,
                EXAMPLE_ALT_SERVICE
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(await ipfsClient.pin.remote.service.ls());

            expect(
                result.map(normalizeService)
            ).to.deep.equal([
                EXAMPLE_SERVICE,
                EXAMPLE_ALT_SERVICE
            ].map(normalizeService));
        });

        it("should support including stat for remote services", async () => {
            const validStat = {
                stat: {
                    status: 'valid',
                    pinCount: {
                        queued: 1,
                        pinning: 1,
                        pinned: 1,
                        failed: 1
                    }
                }
            };
            const invalidStat = {
                stat: {
                    status: 'invalid'
                }
            };

            await mockNode.forPinRemoteLs().thenReturn([
                {
                    ...EXAMPLE_SERVICE,
                    ...validStat
                },
                {
                    ...EXAMPLE_ALT_SERVICE,
                    ...invalidStat
                }
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(await ipfsClient.pin.remote.service.ls({ stat: true }));

            expect(
                result.map(normalizeService)
            ).to.deep.equal([
                {
                    ...EXAMPLE_SERVICE,
                    ...validStat
                },
                {
                    ...EXAMPLE_ALT_SERVICE,
                    ...invalidStat
                }
            ].map(normalizeService));
        });

        it("should return default stat for remote services", async () => {
            await mockNode.forPinRemoteLs().thenReturn([
                EXAMPLE_SERVICE
            ]);

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = await itAll(await ipfsClient.pin.remote.service.ls({ stat: true }));

            expect(
                result.map(normalizeService)
            ).to.deep.equal([
                {
                    ...EXAMPLE_SERVICE,
                    stat: {
                        status: 'invalid'
                    }
                }
            ].map(normalizeService));
        });

        it("can timeout remote service resolution", async () => {
            await mockNode.forPinRemoteLs().thenTimeout();

            const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

            const result = ipfsClient.pin.remote.service.ls();

            expect(await Promise.race([
                result,
                delay(500).then(() => 'timeout')
            ])).to.equal('timeout');
        });

    });

});