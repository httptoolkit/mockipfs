/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    buildIpfsStreamResponse,
} from "../utils/http";

export class PinLsRuleBuilder {

    constructor(
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {}

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

    thenTimeout() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

    thenCloseConnection() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.CloseConnectionHandlerDefinition()
        });
    }

}