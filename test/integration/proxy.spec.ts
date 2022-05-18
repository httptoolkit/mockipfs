/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */


import {
    expect,
    MockIPFS,
    IpfsClient,
    RealIpfsClient,
    realIpfsNodePromise,
    itValue
} from '../test-setup';

describe("Proxying to a real IPFS node", function () {

    let mockNode: MockIPFS.MockIPFSNode;
    let realNode: RealIpfsClient;

    before(async () => {
        realNode = await realIpfsNodePromise;
        const apiMultiaddr = (await realNode.config.getAll())
            .Addresses!.API!;

        const [ , , ip, , port] = apiMultiaddr!.split('/');
        const apiUrl = `http://${ip}:${port}`;

        mockNode = MockIPFS.getLocal({
            // Set default behaviour to be backed by this real IPFS node:
            unmatchedRequests: { 'proxyTo': apiUrl }
        });

    });

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("should forward unmatched requests", async () => {
        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

        // Write through the mock node via an HTTP client:
        const addResult = await ipfsClient.add('test content');

        // Read from the real node, to check the write made it through:
        const realReadValue = await itValue(realNode.cat(addResult.cid));
        expect(Buffer.from(realReadValue).toString()).to.equal('test content');
    });

});