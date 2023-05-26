/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    buildIpfsFixedValueResponse,
    IpfsFixedResponseHandlerDefinition
} from "../utils/http";

/**
 * A builder to allow defining rules that will mock IPFS pin remote add requests.
 */
export class PinRemoteAddRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forPinRemoteAdd(cid)` instead.
     */
    constructor(
        private cid: string | undefined,
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (cid) {
            this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: cid }));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    /**
     * Return a successful result, as if the IPFS content was pinned successfully.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenPinSuccessfully() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: this.cid
                ? new IpfsFixedResponseHandlerDefinition(200, {
                    Cid: this.cid
                })
                : new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                    const url = new URL(req.url);
                    const cid = url.searchParams.get('arg');
                    return buildIpfsFixedValueResponse(200, {
                        Cid: cid
                    });
                })
        });
    }

    thenFailWith(err: Error | string) {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                if (err instanceof Error) {
                    throw err;
                }
                throw new Error(err);
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
            matchers: this.matchers,
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
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CloseConnectionHandlerDefinition()
        });
    }

}