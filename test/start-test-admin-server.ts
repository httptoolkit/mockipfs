/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

const MockIPFS = require('../src/main');
MockIPFS.getAdminServer().start().then(() => {
    console.log("Test admin server started");
}).catch((error: any) => {
    console.error(error);
    process.exit(1);
});