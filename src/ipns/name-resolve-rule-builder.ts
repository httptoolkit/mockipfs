/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {  IpfsFixedResponseHandlerDefinition } from "../utils/http";

export class NameResolveRuleBuilder {

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

    thenResolveTo(path: string) {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new IpfsFixedResponseHandlerDefinition(200, {
                Path: path
            })
        });
    }

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

    thenTimeout() {
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