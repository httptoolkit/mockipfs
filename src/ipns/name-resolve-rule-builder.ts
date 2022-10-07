/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {  IpfsFixedResponseHandlerDefinition } from "../utils/http";

/**
 * A builder to allow defining rules that will mock IPNS name resolution requests.
 */
export class NameResolveRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forNameResolve(name)` instead.
     */
    constructor(
        private name: string | undefined,
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (name) {
            this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: name }));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    /**
     * Return a successful name resolution result, resolving to the given IPFS path.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenResolveTo(path: string) {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new IpfsFixedResponseHandlerDefinition(200, {
                Path: path
            })
        });
    }

    /**
     * Return a failing name resolution result, rejecting the request as if the name was not found.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenFailToResolve() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new IpfsFixedResponseHandlerDefinition(500, {
                Message: `queryTxt ENOTFOUND _dnslink.${this.name}`,
                Code: 0,
                Type: 'error'
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