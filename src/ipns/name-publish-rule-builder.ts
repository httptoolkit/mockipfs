/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import { buildIpfsFixedValueResponse } from "../utils/http";

/**
 * A builder to allow defining rules that will mock IPNS name publication requests.
 */
export class NamePublishRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forNamePublish(name)` instead.
     */
    constructor(
        nameKey: string | undefined,
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (nameKey === 'self') {
            // Self is special - it's the default value, so we're flexible on matching:
            this.matchers.push(new Mockttp.matchers.CallbackMatcher((req) => {
                const params = new URL(req.url).searchParams;
                return (params.get('key') ?? 'self') === 'self';
            }));
        } else if (nameKey) {
            this.matchers.push(new Mockttp.matchers.QueryMatcher({ key: nameKey }));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    /**
     * Limit the rule so that it matches only publications of a specific IPFS path.
     */
    withContent(cid: string) {
        this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: cid }));
        return this;
    }

    /**
     * Return a successful result, as if the IPNS name was published, returning a default mock IPNS result.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenAcceptPublish() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                const parsedURL = new URL(req.url);

                const value = parsedURL.searchParams.get('arg')!;

                return buildIpfsFixedValueResponse(200, {
                    // We can't guess the name (the CID for the given key) so we return a mock string
                    Name: 'mock-ipns-name',
                    Value: value
                });
            })
        });
    }

    /**
     * Return a successful result, as if the IPNS name was published, returning a given IPNS name.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenAcceptPublishAs(name: string) {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                const parsedURL = new URL(req.url);

                const value = parsedURL.searchParams.get('arg')!;

                return buildIpfsFixedValueResponse(200, {
                    Name: name,
                    Value: value
                });
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