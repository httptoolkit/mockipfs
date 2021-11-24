# Mockipfs [![Build Status](https://github.com/httptoolkit/mockipfs/workflows/CI/badge.svg)](https://github.com/httptoolkit/mockipfs/actions) [![Available on NPM](https://img.shields.io/npm/v/mockipfs.svg)](https://npmjs.com/package/mockipfs)

> _Part of [HTTP Toolkit](https://httptoolkit.tech): powerful tools for building, testing & debugging HTTP(S)_

Mockipfs lets you build a fake IPFS node, or proxy traffic to a real IPFS node, and inspect & mock the interactions made by your IPFS client.

## Features

More specifically, Mockipfs lets you:

* Write automated tests for an IPFS application, and confirm that it interacts with the IPFS network correctly, with no real IPFS node required.
* Safely run IPFS tests in parallel, with autoconfiguration of ports and URLs that allows for totally independent parallel testing.
* Test how your client behaves with hard-to-reproduce issues like slow content retrieval, invalid (hash mismatch) node responses, or failed publishes.
* Understand exactly what an IPFS application or webapp is reading & publishing.
* Build your own IPFS proxy that transform published content (anywhere) and read content (only in environments that don't validate hashes).
* Easily play with IPFS in an isolated environment, with none of the unreliability & latency of interaction with the outside world.

## Get Started

```bash
npm install --save-dev mockipfs
```

## Get Testing

Let's write our first automated test with Mockipfs. To test IPFS-based code, you typically need to:

* Start a Mockipfs node
* Mock the behaviour that you're interested in
* Run the real IPFS code that you're testing
* Assert on the calls the Mockipfs node saw

A simple example of that, testing code based on [ipfs-http-client](https://www.npmjs.com/package/ipfs-http-client), might look like this:

```typescript
const mockNode = require("mockipfs").getLocal();
const Ipfs = require("ipfs-http-client");

describe("Mockifps", () => {
    // Start & stop your mock node between tests
    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("lets you mock behaviour and assert on node interactions", async () => {
        const hash = "a-fake-ipfs-hash";

        // Mock some node endpoints:
        const catMock = await mockNode.forCat(hash).thenReturn("Mock content");

        // Lookup some content with a real IPFS client:
        const ipfsClient = Ipfs.create(mockNode.ipfsOptions);
        const content = ipfsClient.cat(hash);

        // Assert on the response:
        expect(cat).to.equal("Mock content");

        // Assert that our mock was called as expected:
        const catRequests = await catMock.getSeenRequests();
        expect(catRequests.length).to.equal(1);
        expect(catRequests[0].hash).to.equal(hash);
    });
});
```