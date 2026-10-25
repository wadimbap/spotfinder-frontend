import { expect, it } from "vitest";
import { getApiError } from "../src/shared/api/apiError";

it.each([
    [401, "Your session has expired. Please sign in again."],
    [403, "You do not have permission to perform this action."],
    [404, "The spot no longer exists."],
    [409, "The spot is already approved."],
    [413, "Photo file is too large"],
    [415, "Unsupported photo type"],
])("explains HTTP %s without treating it as success", (status, message) => {
    expect(getApiError({ isAxiosError: true, response: { status, data: { message } } }, "Failed.")).toBe(message);
});

it("shows field validation errors and hides internal server details", () => {
    expect(getApiError({ isAxiosError: true, response: { status: 400, data: { fieldErrors: { name: "Name is too short", type: "Select a type" } } } }, "Failed."))
        .toBe("Name is too short Select a type");
    expect(getApiError({ isAxiosError: true, response: { status: 500, data: { message: "Internal storage credentials" } } }, "Failed."))
        .toBe("Failed. Please try again later.");
});
