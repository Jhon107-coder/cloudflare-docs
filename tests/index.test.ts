import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	fetchMock,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import openAPISchema from "./fixtures/openapi.json";

describe("Cloudflare Docs", () => {
	beforeAll(async () => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => {
		fetchMock.assertNoPendingInterceptors();
	});

	it("responds with index.html at `/`", async () => {
		const request = new Request("http://fakehost/");
		const response = await SELF.fetch(request);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("Cloudflare Docs");
	});

	// Remove once the whacky double-slash rules get removed
	it("responds with index.html at `//`", async () => {
		const request = new Request("http://fakehost//");
		const response = await SELF.fetch(request);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("Cloudflare Docs");
	});

	it("responds with 404.html at `/non-existent`", async () => {
		const request = new Request("http://fakehost/non-existent");
		const response = await SELF.fetch(request);
		expect(response.status).toBe(404);
		expect(await response.text()).toContain("Page not found.");
	});

	it("responds with API schema at `/schema`", async () => {
		fetchMock
			.get("https://raw.githubusercontent.com")
			.intercept({ path: "/cloudflare/api-schemas/main/openapi.json" })
			.reply(200, JSON.stringify(openAPISchema));

		const request = new Request("http://fakehost/schema");
		const response = await SELF.fetch(request);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		const data = (await response.json()) as any;
		expect(Object.keys(data)).toMatchInlineSnapshot(`
			[
			  "components",
			  "info",
			  "openapi",
			  "paths",
			  "security",
			  "servers",
			]
		`);
	});

	it("responds with API docs files at `/api/*`", async () => {
		const mockContents = `const some = 'js';`;

		fetchMock
			.get("https://cloudflare-api-docs-frontend.pages.dev")
			.intercept({
				path: (p) => {
					return p === "//static/js/file.js";
				},
			})
			.reply(200, mockContents);

		const request = new Request("http://fakehost/api/static/js/file.js");
		const response = await SELF.fetch(request);
		expect(await response.text()).toEqual(mockContents);
	});
});
