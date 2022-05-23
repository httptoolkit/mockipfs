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

export class AddRuleBuilder {

    constructor(
        private contentMatchers: Array<ContentDefinition> | undefined,
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