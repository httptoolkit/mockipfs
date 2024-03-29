# MockIPFS [![Build Status](https://github.com/httptoolkit/mockipfs/workflows/CI/badge.svg)](https://github.com/httptoolkit/mockipfs/actions) [![Available on NPM](https://img.shields.io/npm/v/mockipfs.svg)](https://npmjs.com/package/mockipfs)

> _Part of [HTTP Toolkit](https://httptoolkit.tech): powerful tools for building, testing & debugging HTTP(S), Ethereum, IPFS, and more_

MockIPFS lets you build a fake IPFS node, or proxy traffic to a real IPFS node, and inspect & mock the interactions made by your IPFS API client (e.g. [ipfs-http-client](https://www.npmjs.com/package/ipfs-http-client)).

---

:warning: _MockIPFS is still new & rapidly developing!_ :warning:

_Everything described here works today, but there's lots more to come, and some advanced use cases may run into rough edges. If you hit any problems or missing features, please [open an issue](https://github.com/httptoolkit/mockipfs/issues/new)._

---

## Features

More specifically, MockIPFS lets you:

* Write automated tests for an IPFS web application, and confirm that it interacts with the IPFS network correctly, with no real IPFS node required.
* Speed up & reduce overhead from IPFS automated tests: run hundreds of IPFS integration tests a second with a completely fresh state every time.
* Safely & reliably run IPFS tests in parallel, with autoconfiguration of ports and URLs that allows for totally independent parallel testing.
* Test how your client behaves with hard-to-reproduce issues like slow content retrieval, invalid (hash mismatch) node responses, or failed publishes.
* Inspect interactions to understand exactly what an IPFS client or webapp is reading & publishing.
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

## Getting Started

First, install MockIPFS:

```bash
npm install --save-dev mockipfs
```

Once you've installed the library, you'll want to use it in your test or automation code. To do so you need to:

* Create an new MockIPFS node
* Start the node, to make it listen for requests (and stop it when you're done)
* Use the URL of the MockIPFS node as your IPFS node URL
* Define some rules to mock behaviour

### Creating a MockIPFS node

To create a node in Node.js, you can simply call `MockIPFS.getLocal()` and you're done.

In many cases though, to test a web application you'll want to run your tests inside a browser, and create & manage your mock IPFS node there too. It's not possible to launch a node from inside a browser, but MockIPFS provides a separate admin server you can run, which will host your mock IPFS node externally.

Once your admin server is running, you can use the exact same code as for Node.js, but each method call is transparently turned into a remote-control call to the admin server.

To do this, you just need to run the admin server before you start your tests, and stop it afterwards. You can do that in one of two ways:

* You can run your test suite using the provided launch helper:
  ```
  mockipfs -c <your test command>
  ```
  This will start & stop the admin server automatically before and after your tests.
* Or you can launch the admin server programmatically like so:
  ```javascript
  import * as MockIPFS from 'mockipfs';

  const adminServer = MockIPFS.getAdminServer();
  adminServer.start().then(() =>
      console.log('Admin server started')
  );
  ```

Note that as this is a universal library (it works in Node.js & browsers) this code does reference some Node.js modules & globals in a couple of places. If you're using MockIPFS from inside a browser, this needs to be handled by your bundler. In many bundlers this will be handled automatically, but if it's not you may need to enable node polyfills for this. In Webpack that usually means enabling [node-polyfill-webpack-plugin](https://www.npmjs.com/package/node-polyfill-webpack-plugin), or in ESBuild you'll want the [`@esbuild-plugins/node-modules-polyfill`](https://www.npmjs.com/package/@esbuild-plugins/node-modules-polyfill) and [`@esbuild-plugins/node-globals-polyfill`](https://www.npmjs.com/package/@esbuild-plugins/node-globals-polyfill) plugins.

Once you have an admin server running, you can call `MockIPFS.getLocal()` in the browser in exactly the same way as in Node.js, and it will automatically find & use the local admin server to create your mock IPFS node.

### Starting & stopping your MockIPFS node

Nodes expose `.start()` and `.stop()` methods to start & stop the node. You should call `.start()` before you use the node, call `.stop()` when you're done with it, and in both cases wait for the promise that's returned to ensure everything is completed before continuing.

In automation, you'll want to create the node and start it immediately, and only stop it at shutdown. In testing environments it's usually better to start & stop the node between tests, like so:

```javascript
import * as MockIPFS from 'mockipfs';

const mockNode = MockIPFS.getLocal();

describe("A suite of tests", () => {

  beforeEach(async () => {
    await mockNode.start();
  });

  afterEach(async () => {
    await mockNode.stop();
  });

  it("A single test", () => {
    // ...
  });

});
```

### Using your MockIPFS node

To use your MockIPFS node instead of connecting to a real IPFS node and the real network, you just need to use the mock node's address for your IPFS HTTP client. For `ipfs-http-client` you can pass the exposed `ipfsOptions` object directly, like so:

```javascript
import * as IPFS from "ipfs-http-client";

const ipfsClient = IPFS.create(mockNode.ipfsOptions);

// Now use ipfsClient as normal, and all interactions will be sent to the mock node instead of
// any real IPFS node, and so will not touch the real IPFS network (unless you explicitly proxy
// them - see 'Proxying IPFS Traffic' below).
```

### Mocking IPFS interactions

MockIPFS provides an API that defines rules for interactions with the IPFS node. For example, you can:

* Mock `ipfs cat` data, so real IPFS API calls return custom content for any id you request.
* Create timeouts so that `ipfs cat` for a given CID times out entirely.
* Simulate node connection errors, where IPFS requests fail entirely.
* Define fake IPNS records and change them dynamically during your test.
* Query the list of pinned IPFS content at the end of your test.
* (More API methods to come - [open an issue]((https://github.com/httptoolkit/mockipfs/issues/new)) if you have suggestions!)

All in an isolated environment that can be set up & torn down in <1ms.

MockIPFS allows you to define any behaviours you like for a wide variety of IPFS interactions, to simulate everything from normal IPFS add/cat interactions, to tricky to test failure cases (like timeouts or unpinned content disappearing due to garbage collection as your code runs), to scenarios that are difficult to impossible to intentionally create with real IPFS (incorrect content for a hash, low-level connection errors, or )

By default, for all supported 'submit' methods in IPFS (e.g. `ipfs add` and `ipfs name publish`) MockIPFS will accept the submitted data, record the request, and send a successful response, but without changing any real state. Meanwhile all query methods behave by default as if the requested content was not found/not available for all requests.

To change this, you define mock rules, with a chain of method calls on your MockIPFS node (typically created with `MockIPFS.getLocal()`).

Defining a rule always starts with `mockNode.forX()` for some X that you want to change (e.g. `.forCat('QmcKQ...')`), followed by further calls for advanced configuration, and ending with a `.thenY()` method for some Y result you want to set.

For example, you can call `mockNode.forCat('QmcKQ...').thenReturn('Fake IPFS content')` to

After calling any `.thenY()` method, the new rule will take effect. In Node.js with a local node this happens synchronously, while in browsers or using remote mock nodes this may be asynchronous. All methods return promises regardless, so that you can easily write consistent await-based code that works in both environments.

The full list of methods available is:

* `forCat(ipfsPath?: string)` - Mock `ipfs cat` for a specific path (or all paths, if no path is provided)
  * `thenReturn(rawData: string`) - The mock data to return
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forGet(ipfsPath?: string)` - Mock `ipfs get` for a specific path (or all paths, if no path is provided)
  * `thenReturn(rawData: string`) - The mock data to return
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forAdd()`  - Mock content publishing (`ipfs add`) for all content
  * `thenAcceptPublish()` - Return a successful result with mock CID values
  * `thenAcceptPublishAs(result: string | Array<string | { Name, Hash, Size? }>)` - Return a successful result with the given result values
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forAddIncluding(...content: Array<string | Uint8Array | { path, content? })` - Mock IPFS content publishing for all matching requests.
  * This matches all requests that include the given data. The data may be a string, buffer, or an object containing a string path, and an optional string or buffer content.
  * All the same behaviours as `forAdd()` are supported.
* `forNameResolve(ipnsName?: string)` - Mock IPNS name resolution for a given name (or all names, if no name is provided)
  * `thenResolveTo(path: string)` - Return a successful path
  * `thenFailToResolve()` - Return a 'not found' failure
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forNamePublish(ipfsName?: string)` - Mock IPNS name publishing for a given name (or all names, if no name is provided)
  * `withContent(cid)` - Make this rule match only requests that publish this CID
  * `thenAcceptPublish()` - Return a successful result with a mock name
  * `thenAcceptPublishAs(name: string)` - Return a successful result with the given name
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forPinAdd(cid?: string)` - Mock pin addition for a given CID (or all CIDs, if no CID is provided)
  * `thenPinSuccessfully()` - Returns a successful result for the pinned content
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forPinRemoteAdd(cid?: string)` - Mock remote pin addition for a given CID (or all CIDs, if no CID is provided)
  * `thenPinSuccessfully()` - Returns a successful result for the pinned content
  * `thenFailAsDuplicate(message?: string)` - fail as if pin already exists, optionally fail with a specific message. The default message is "reason: \"DUPLICATE_OBJECT\""
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forPinRm(cid?: string)` - Mock pin removal for a given CID (or all CIDs, if no CID is provided)
  * `thenRemoveSuccessfully()` - Return a successful removal result for the content
  * `thenFailAsMissing()` - Return an error, as if the content was not currently pinned
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forPinLs(cid?: string)` - Mock pin listing for a given CID (or all CIDs, if no CID is provided)
  * `thenReturn(values: Array<{ type, cid }>)` - Return a given list of pins.
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error
* `forPinRemoteLs()` - Mock listing registered remote pinning services
  * `thenReturn(values: Array<{ service: string, endpoint: URL, stat?: Stat }>)` - Return a given list of remote services.
  * `thenTimeout()` - Wait forever, returning no response
  * `thenCloseConnection()` - Kills the TCP connection, causing a network error

### Examining IPFS requests

Once you have made some IPFS requests to your mock IPFS node, you can then query the seen requests using a few methods:

* `mockNode.getQueriedContent()`
* `mockNode.getAddedContent()`
* `mockNode.getIPNSQueries()`
* `mockNode.getIPNSPublications()`
* `mockNode.getAddedPins()`
* `mockNode.getRemovedPins()`

Each of these will return an array summarizing the details of the calls made since the node was started, allowing you to assert on all IPFS interactions made during your tests.

### Proxying IPFS traffic

MockIPFS can also proxy IPFS traffic to a real IPFS node. This allows two advanced use cases:

* In tests, you can intercept only some specific IPFS interactions, while leaving all other interactions working as normal using the real IPFS network.
* You can build an IPFS proxy, configure an IPFS client (e.g. your browser) to use this as your IPFS node, and then examine the recorded interactions and/or mock specific interactions to understand exactly how that client is using IPFS, for debugging or reverse engineering.

To do this, pass `unmatchedRequests: { proxyTo: "a-real-ipfs-node-HTTP-url" }` as an option when creating your mock IPFS node. This will disable the default stub responses, and proxy all unmatched requests to the given node instead. For example:

```javascript
import * as MockIPFS from 'mockipfs'
const mockNode = MockIPFS.getLocal({
  unmatchedRequests: { proxyTo: "http://localhost:5001" }
});
mockNode.start();
```

This only changes the unmatched request behaviour, and all other methods will continue to define behaviour and query seen request data as normal.

## API Reference Documentation

For more details, see the [MockIPFS reference docs](https://httptoolkit.github.io/mockipfs/).

---

_This‌ ‌project‌ ‌has‌ ‌received‌ ‌funding‌ ‌from‌ ‌the‌ ‌European‌ ‌Union’s‌ ‌Horizon‌ ‌2020‌‌ research‌ ‌and‌ ‌innovation‌ ‌programme‌ ‌within‌ ‌the‌ ‌framework‌ ‌of‌ ‌the‌ ‌NGI-POINTER‌‌ Project‌ ‌funded‌ ‌under‌ ‌grant‌ ‌agreement‌ ‌No‌ 871528._

![The NGI logo and EU flag](./ngi-eu-footer.png)
