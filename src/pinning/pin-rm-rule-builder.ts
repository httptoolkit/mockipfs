/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    buildIpfsFixedValueResponse,
    IpfsFixedResponseHandlerDefinition
} from "../utils/http";

export class PinRmRuleBuilder {

    constructor(
        private cid: string | undefined,
        private addResolveRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (cid) {
            this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: cid }));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    thenRemoveSuccessfully() {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: this.cid
                ? new IpfsFixedResponseHandlerDefinition(200, {
                    Pins: [this.cid]
                })
                : new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                    const url = new URL(req.url);
                    const cid = url.searchParams.get('arg');
                    return buildIpfsFixedValueResponse(200, { Pins: [cid] });
                })
        });
    }

    thenFailAsMissing() {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: this.cid
                ? new IpfsFixedResponseHandlerDefinition(500, {
                    "Message": `Failed to remove pin: ${this.cid} is not pinned`,
                    "Code": 0,
                    "Type": "error"
                })
                : new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                    const url = new URL(req.url);
                    const cid = url.searchParams.get('arg');

                    return buildIpfsFixedValueResponse(500, {
                        "Message": `Failed to remove pin: ${cid} is not pinned`,
                        "Code": 0,
                        "Type": "error"
                    });
                })
        });
    }

    thenTimeout() {
        return this.addResolveRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

}