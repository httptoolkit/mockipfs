/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { MockedEndpoint } from "mockttp";

export class MockedIPFSEndpoint {
    constructor(
        private mockedHttpEndpoint: MockedEndpoint
    ) {}

    isPending = () => this.mockedHttpEndpoint.isPending();

    /**
     * Return an array of the requests seen by this endpoint.
     */
    async getSeenRequests() {
        const requests = await this.mockedHttpEndpoint.getSeenRequests();

        return requests.map((request) => {
            const { searchParams } = new URL(request.url);
            const params = Array.from(searchParams.entries())
                .reduce<{
                    [key: string]: string | string[]
                }>((result, [key, value]) => {
                    const currentValue = result[key];
                    if (!currentValue) {
                        result[key] = value;
                    } else if (!Array.isArray(currentValue)) {
                        result[key] = [currentValue, value];
                    } else {
                        currentValue.push(value);
                    }

                    return result;
                }, {});


            return { params };
        });
    }

}