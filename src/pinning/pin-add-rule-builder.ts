/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    buildIpfsFixedValueResponse,
    IpfsFixedResponseHandlerDefinition
} from "../utils/http";

export class PinAddRuleBuilder {

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

    thenPinSuccessfully() {
        return this.addRuleCallback({
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

    thenTimeoutAsUnavailable() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

    thenCloseConnection() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CloseConnectionHandlerDefinition()
        });
    }

}