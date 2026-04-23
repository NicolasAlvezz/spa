export async function register() {
  if (process.env.BRAINTRUST_API_KEY) {
    const { initLogger } = await import("braintrust");
    initLogger({
      projectName: "braintrust-rose-basket",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
  }
}
