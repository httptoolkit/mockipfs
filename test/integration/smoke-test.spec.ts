import { expect } from "chai";

import * as mockipfs from "../..";
import * as Ipfs from "ipfs-http-client";

const mockNode = mockipfs.getLocal();

describe("Mockifps", () => {
    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("has a test", () => {
    });
});