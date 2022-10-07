/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    buildIpfsStreamResponse,
} from "../utils/http";

/**
 * A builder to allow defining rules that will mock IPFS pin ls requests.
 */
export class PinLsRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forPinLs()` instead.
     */
    constructor(
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {}

    /**
     * Return a successful result, returning the given fixed list of pinned content. The parameter should
     * be an array of `{ type, cid }` objects, where type is the pin type (direct, recursive, indirect, or
     * all), and cid is the CID of the pinned content.
     *
     * When this matches a request that specifies a filter (e.g. ?type=direct) only the values with the
     * matching type will be returned.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenReturn(values: Array<{ type: string, cid: string }>) {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                const searchParams = new URL(req.url).searchParams;

                const typeFilter = searchParams.get('type');

                const valuesToReturn = values
                    .filter(v => typeFilter && typeFilter !== 'all'
                        ? v.type === typeFilter
                        : true
                    ).map(({ type, cid }) => ({
                        Type: type,
                        Cid: cid
                    }));

                return buildIpfsStreamResponse(200, ...valuesToReturn);
            })
        });
    }

    /**
     * Timeout, accepting the request but never returning a response.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenTimeout() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

    /**
     * Close the connection immediately after receiving the matching request, without sending any response.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenCloseConnection() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.CloseConnectionHandlerDefinition()
        });
    }

}