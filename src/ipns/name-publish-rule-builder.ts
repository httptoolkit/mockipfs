/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import { buildIpfsFixedValueResponse } from "../utils/http";

export class NamePublishRuleBuilder {

    constructor(
        private nameKey: string | undefined,
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

    withContent(cid: string) {
        this.matchers.push(new Mockttp.matchers.QueryMatcher({ arg: cid }));
        return this;
    }

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

    thenTimeout() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

}