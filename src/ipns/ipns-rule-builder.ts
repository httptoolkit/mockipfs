/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

export class IPNSActionBuilder {

    constructor(
        private name: string | undefined,
        private addResolveRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (name) {
            this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: name }));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    thenResolveTo(path: string) {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.SimpleHandlerDefinition(
                200,
                undefined,
                JSON.stringify({
                    Path: path
                }),
                {
                    'content-type': 'application/json',
                    // This matches the IPFS headers, and it's also required to work around various
                    // Undici fetch + Mockttp minimal response bugs in Node 18
                    'transfer-encoding': 'chunked',
                    'connection': 'close'
                }
            )
        });
    }

    thenFailToResolve() {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.SimpleHandlerDefinition(
                200,
                undefined,
                JSON.stringify({
                    Message: `queryTxt ENOTFOUND _dnslink.${this.name}`,
                    Code: 0,
                    Type: 'error'
                }),
                {
                    'content-type': 'application/json',
                    // This matches the IPFS headers, and it's also required to work around various
                    // Undici fetch + Mockttp minimal response bugs in Node 18
                    'transfer-encoding': 'chunked',
                    'connection': 'close'
                }
            )
        });
    }

    thenTimeout() {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

}