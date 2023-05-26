/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { RequestRuleBuilder } from "mockttp";
import { MockedIPFSEndpoint } from "./mocked-endpoint";
import { buildIpfsStreamDefaultHeaders } from "./utils/http";

/**
 * A builder to allow defining rules that will mock IPFS get requests.
 */
export class ContentRetrievalRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forGet(cid)` instead.
     */
    constructor(
        private httpRuleBuilder: RequestRuleBuilder
    ) {}

    /**
     * Return a successful result, returning the the raw content provided here as if it
     * came instantly from IPFS.
     *
     * This method completes the rule definition, and returns a promise that resolves to a
     * MockedIPFSEndpoint once the rule is active. This endpoint can be used to query the rule,
     * and check what requests were received for this content.
     */
    async thenReturn(rawData: string) {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenReply(200, rawData, buildIpfsStreamDefaultHeaders())
        );
    }

    /**
     * Timeout, accepting the request but never returning a response.
     *
     * This method completes the rule definition, and returns a promise that resolves to a
     * MockedIPFSEndpoint once the rule is active. This endpoint can be used to query the rule,
     * and check what requests were received for this content.
     */
    async thenTimeout() {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenTimeout()
        );
    }

    /**
     * Close the connection immediately after receiving the matching request, without sending any response.
     *
     * This method completes the rule definition, and returns a promise that resolves to a
     * MockedIPFSEndpoint once the rule is active. This endpoint can be used to query the rule,
     * and check what requests were received for this content.
     */
    async thenCloseConnection() {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenCloseConnection()
        );
    }
}