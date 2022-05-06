/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { RequestRuleBuilder } from "mockttp";
import { MockedIPFSEndpoint } from "./mocked-endpoint";
import { buildIpfsStreamDefaultHeaders } from "./utils/http";

export class CatRuleBuilder {
    constructor(
        private httpRuleBuilder: RequestRuleBuilder
    ) {}

    async thenReturn(rawData: string) {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenReply(200, rawData, buildIpfsStreamDefaultHeaders())
        );
    }

    async thenTimeout() {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenTimeout()
        );
    }

    async thenCloseConnection() {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenCloseConnection()
        );
    }
}