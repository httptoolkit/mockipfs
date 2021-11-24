import { RequestRuleBuilder } from "mockttp";
import { MockedIpfsEndpoint } from "./mocked-endpoint";

export class RuleBuilder {
    constructor(
        private httpRuleBuilder: RequestRuleBuilder
    ) {}

    async thenReturn(rawData: string) {
        return new MockedIpfsEndpoint(
            await this.httpRuleBuilder.thenReply(200, rawData)
        );
    }
}