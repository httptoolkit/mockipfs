/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { RequestRuleBuilder } from "mockttp";
import { MockedIPFSEndpoint } from "./mocked-endpoint";

export class CatRuleBuilder {
    constructor(
        private httpRuleBuilder: RequestRuleBuilder
    ) {}

    async thenReturn(rawData: string) {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenReply(200, rawData)
        );
    }

    async thenTimeout() {
        return new MockedIPFSEndpoint(
            await this.httpRuleBuilder.thenTimeout()
        );
    }
}