/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

import {
    buildIpfsStreamResponse,
    parseMultipartBody
} from "../utils/http";
import { mockAddResultPart } from "./add-mock";

type ContentDefinition =
    | string
    | Uint8Array
    | { path?: string, content?: string | Uint8Array };

/**
 * A builder to allow defining rules that will mock IPFS add requests.
 */
export class AddRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forAdd()` or
     * `mockNode.forAddIncluding(content)` instead.
     */
    constructor(
        contentMatchers: Array<ContentDefinition> | undefined,
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {
        if (contentMatchers?.length) {
            this.matchers.push(new Mockttp.matchers.MultipartFormDataMatcher(
                contentMatchers.map((contentMatcher): Mockttp.matchers.MultipartFieldMatchCondition => {
                    if (typeof contentMatcher === 'string'|| contentMatcher instanceof Uint8Array) {
                        return { content: contentMatcher };
                    } else if ('path' in contentMatcher) {
                        return {
                            content: contentMatcher.content,
                            filename: encodeURIComponent(contentMatcher.path!)
                        };
                    } else {
                        return contentMatcher;
                    }
                })
            ));
        } else {
            this.matchers.push(new Mockttp.matchers.WildcardMatcher());
        }
    }

    private matchers: Mockttp.matchers.RequestMatcher[] = [];

    /**
     * Return a successful result, as if the content was published to IPFS, and returning mock CID values.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenAcceptPublish() {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition(async (req) => {
                const addedParts = parseMultipartBody((await req.body.getDecodedBuffer())!, req.headers);

                return buildIpfsStreamResponse(200,
                    ...addedParts.map((part) => mockAddResultPart(part))
                );
            })
        });
    }

    /**
     * Return a successful result, as if the content was published to IPFS, and returning a given fixed mock CID
     * value, array of values, or full array of `{ Name, Hash, Size }` results.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenAcceptPublishAs(result: string | Array<string | { Name: string, Hash: string, Size?: number }>) {
        return this.addRuleCallback({
            matchers: this.matchers,
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition(async (req) => {
                const addedParts = parseMultipartBody((await req.body.getDecodedBuffer())!, req.headers);

                if (!Array.isArray(result)) {
                    return buildIpfsStreamResponse(200,
                        ...addedParts.map((part) => mockAddResultPart(part, result))
                    );
                } else {
                    return buildIpfsStreamResponse(200,
                        ...result.map((resultPart) => {
                            if (typeof resultPart === 'string') {
                                return { Name: resultPart, Hash: resultPart, Size: -1 };
                            } else {
                                return {
                                    Size: -1,
                                    ...resultPart
                                };
                            }
                        })
                    );
                }
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