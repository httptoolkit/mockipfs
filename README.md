# MockIPFS [![Build Status](https://github.com/httptoolkit/mockipfs/workflows/CI/badge.svg)](https://github.com/httptoolkit/mockipfs/actions) [![Available on NPM](https://img.shields.io/npm/v/mockipfs.svg)](https://npmjs.com/package/mockipfs)

> _Part of [HTTP Toolkit](https://httptoolkit.tech): powerful tools for building, testing & debugging HTTP(S), IPFS, and more_

MockIPFS lets you build a fake IPFS node, or proxy traffic to a real IPFS node, and inspect & mock the interactions made by your IPFS API client (e.g. [ipfs-http-client](https://www.npmjs.com/package/ipfs-http-client)).

## Features

More specifically, MockIPFS lets you:

* Write automated tests for an IPFS web application, and confirm that it interacts with the IPFS network correctly, with no real IPFS node required.
* Safely & reliably run IPFS tests in parallel, with autoconfiguration of ports and URLs that allows for totally independent parallel testing.
* Test how your client behaves with hard-to-reproduce issues like slow content retrieval, invalid (hash mismatch) node responses, or failed publishes.
* Understand exactly what an IPFS client or webapp is reading & publishing.
* Build your own IPFS proxy that transforms content as it's published (anywhere) and read (in environments that don't validate hashes).
* Easily play with IPFS in a fully isolated environment, with none of the unreliability & latency of interaction with the real world.

## Example

Let's write our first automated test with MockIPFS. To test IPFS-based code, you will typically need to:

* Start a MockIPFS node
* Mock the behaviour that you're interested in
* Create a real IPFS client that is configured to use your MockIPFS node
* Run your real IPFS code that you're testing
* Assert on the calls the MockIPFS node saw

A simple example of that, testing code based on [ipfs-http-client](https://www.npmjs.com/package/ipfs-http-client), might look like this:

```typescript
// Standard packages to make IPFS requests:
import * as IPFS from "ipfs-http-client";
import itAll from 'it-all';
import {
    concat as uint8ArrayConcat,
    toString as uint8ToString
} from 'uint8arrays';

// Import MockIPFS and create a fake node:
import * as MockIPFS from 'mockipfs'
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
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);
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
```