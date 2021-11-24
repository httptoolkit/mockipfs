import { expect } from "chai";

import * as mockipfs from "../..";

import * as Ipfs from "ipfs-http-client";

import all = require('it-all');
import {
    concat as uint8ArrayConcat,
    toString as uint8ToString
} from 'uint8arrays';

const mockNode = mockipfs.getLocal();

describe("Mockifps", () => {
    // Start & stop your mock node between tests
    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("lets you mock behaviour and assert on node interactions", async () => {
        const ipfsPath = "/ipfs/a-fake-IPFS-id";

        // Mock some node endpoints:
        const catMock = await mockNode.forCat(ipfsPath).thenReturn("Mock content");

        // Lookup some content with a real IPFS client:
        const ipfsClient = Ipfs.create(mockNode.ipfsOptions);
        const content = await all(ipfsClient.cat(ipfsPath));

        // Assert on the response:
        const contentText = uint8ToString(uint8ArrayConcat(content));
        expect(contentText).to.equal("Mock content");

        // Assert that our mock was called as expected:
        const catRequests = await catMock.getSeenRequests();
        expect(catRequests.length).to.equal(1);
        expect(catRequests[0].params.arg).to.equal(ipfsPath);
    });
});