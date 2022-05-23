/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    expect,
    MockIPFS,
    IpfsClient,
    itAll,
    uint8ArrayConcat,
    uint8ToString
} from '../test-setup';

const mockNode = MockIPFS.getLocal();

describe("MockIPFS", () => {
    // Start & stop your mock node to reset state between tests
    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("lets you mock behaviour and assert on node interactions", async () => {
        const ipfsPath = "/ipfs/a-fake-IPFS-id";

        // Mock some node endpoints:
        await mockNode.forCat(ipfsPath).thenReturn("Mock content");

        // Lookup some content with a real IPFS client:
        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);
        const content = await itAll(ipfsClient.cat(ipfsPath));

        // Assert on the response:
        const contentText = uint8ToString(uint8ArrayConcat(content));
        expect(contentText).to.equal("Mock content");

        // Assert that we saw the requests we expected
        const catRequests = await mockNode.getQueriedContent();
        expect(catRequests).to.deep.equal([
            { path: ipfsPath }
        ]);
    });
});